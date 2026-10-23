#!/usr/bin/env python3
"""Extract per-item records from installed, pinned packages.

See docs/ARCHITECTURE.md, "Source extraction approach" and
"Extraction record contract". Run from the project root:

    .venv/bin/python tools/extract.py [--library SLUG] [--id ID ...]
"""
import argparse
import ast
import importlib
import inspect
import json
import math
import re
import sys
import warnings
from pathlib import Path

import yaml

# Experimental scikit-learn estimators (IterativeImputer, Halving*SearchCV) only
# import after these enable modules have run.
from sklearn.experimental import enable_halving_search_cv, enable_iterative_imputer  # noqa: F401
from numpydoc.docscrape import NumpyDocString

EXTRACTOR_VERSION = "1"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INVENTORIES = [
    ROOT / "content/inventory/catalogue.yaml",
    ROOT / "content/inventory/supporting.yaml",
]
DEFAULT_OUT = ROOT / "content/extraction"

PARAM_KINDS = {
    inspect.Parameter.POSITIONAL_ONLY: "positional_only",
    inspect.Parameter.POSITIONAL_OR_KEYWORD: "positional_or_keyword",
    inspect.Parameter.KEYWORD_ONLY: "keyword_only",
    inspect.Parameter.VAR_POSITIONAL: "var_positional",
    inspect.Parameter.VAR_KEYWORD: "var_keyword",
}


class ExtractError(Exception):
    pass


# ---------------------------------------------------------------- inventory

def load_inventory(paths):
    items, seen = [], set()
    for p in paths:
        p = Path(p)
        if not p.exists():
            continue
        data = yaml.safe_load(p.read_text()) or {}
        for entry in data.get("items") or []:
            if entry["id"] in seen:
                print(f"warning: duplicate inventory id {entry['id']} ({p}); skipped",
                      file=sys.stderr)
                continue
            seen.add(entry["id"])
            items.append(entry)
    return items


# ------------------------------------------------------------------ helpers

def resolve(import_path):
    """Import the longest module prefix, then getattr the remainder."""
    parts = import_path.split(".")
    last_err = None
    for i in range(len(parts), 0, -1):
        try:
            obj = importlib.import_module(".".join(parts[:i]))
        except ImportError as e:
            last_err = e
            continue
        try:
            for attr in parts[i:]:
                obj = getattr(obj, attr)
        except AttributeError as e:
            raise ExtractError(f"cannot resolve {import_path}: {e}")
        return obj
    raise ExtractError(f"cannot import {import_path}: {last_err}")


def package_version(import_path):
    top = import_path.split(".")[0]
    mod = importlib.import_module(top)
    v = getattr(mod, "__version__", None)
    if v is None:
        raise ExtractError(f"{top} has no __version__")
    return str(v)


def parse_doc(doc, warnings_out, where):
    if not doc:
        return None
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            nd = NumpyDocString(doc)
        except Exception as e:  # numpydoc raises ValueError on odd sections
            warnings_out.append(f"{where}: docstring not parseable: {e}")
            return None
    for w in caught:
        warnings_out.append(f"{where}: numpydoc: {w.message}")
    return nd


def clean_sig(sig):
    params = list(sig.parameters.values())
    if params and params[0].name in ("self", "cls"):
        sig = sig.replace(parameters=params[1:])
    return sig


def summary_of(nd, obj):
    if nd is not None and nd["Summary"]:
        for line in nd["Summary"]:
            if line.strip():
                return line.strip()
    doc = inspect.getdoc(obj) or ""
    for line in doc.splitlines():
        if line.strip():
            return line.strip()
    return ""


def section(nd, name):
    out = []
    if nd is None:
        return out
    for p in nd[name]:
        out.append({"name": p.name, "type_doc": p.type or "",
                    "description": "\n".join(p.desc).strip()})
    return out


# -------------------------------------------------------------- allowed/consts

def jsonable(v):
    if isinstance(v, float) and math.isinf(v):
        return "inf" if v > 0 else "-inf"
    if v is None:
        return None
    if isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, type):
        return v.__name__
    return str(v)


def translate_constraints(cons, warn, pname):
    from sklearn.utils import _param_validation as pv
    res = {"source": "constraints", "options": [], "intervals": [], "types": []}

    def one(c):
        if isinstance(c, pv.Hidden):
            c = c.constraint
        if isinstance(c, pv.StrOptions):
            res["options"].extend(sorted(c.options))
        elif isinstance(c, pv.Options):
            res["options"].extend(sorted((jsonable(o) for o in c.options), key=str))
        elif isinstance(c, pv.Interval):
            res["intervals"].append({
                "type": getattr(c.type, "__name__", str(c.type)),
                "left": jsonable(c.left), "right": jsonable(c.right),
                "closed": c.closed})
        elif c is None:
            res["types"].append("None")
        elif isinstance(c, (str, type)):
            res["types"].append(jsonable(c))
        else:
            res["types"].append(str(c))

    for c in cons:
        one(c)
    return res


def docstring_options(type_doc):
    for m in re.finditer(r"\{([^{}]*)\}", type_doc or ""):
        elems = [e.strip() for e in m.group(1).split(",") if e.strip()]
        opts, ok = [], bool(elems)
        for e in elems:
            q = re.fullmatch(r"""(['"])(.*)\1""", e)
            if q:
                opts.append(q.group(2))
            elif e in ("None", "True", "False"):
                opts.append(e)
            else:
                ok = False
                break
        if ok and any(re.match(r"""['"]""", e) for e in elems):
            return opts
    return []


def default_from_doc(type_doc):
    m = re.search(r"default\s*[=:]\s*(.+?)\s*$", type_doc or "")
    return m.group(1).strip() if m else None


# --------------------------------------------------------------- introspection

class _Src:
    """Default value carried as source text; repr() returns that text."""

    def __init__(self, text):
        self.text = text

    def __repr__(self):
        return self.text


def _sig_from_text(text):
    """Build an inspect.Signature from '(a, b=1, *, c=2, **kw)' text, or None."""
    try:
        a = ast.parse(f"def f{text}: pass").body[0].args
    except SyntaxError:
        return None
    P = inspect.Parameter
    ps = []
    pos = a.posonlyargs + a.args
    defs = [None] * (len(pos) - len(a.defaults)) + list(a.defaults)
    for i, (arg, d) in enumerate(zip(pos, defs)):
        kind = P.POSITIONAL_ONLY if i < len(a.posonlyargs) else P.POSITIONAL_OR_KEYWORD
        ps.append(P(arg.arg, kind, default=P.empty if d is None else _Src(ast.unparse(d))))
    if a.vararg:
        ps.append(P(a.vararg.arg, P.VAR_POSITIONAL))
    for arg, d in zip(a.kwonlyargs, a.kw_defaults):
        ps.append(P(arg.arg, P.KEYWORD_ONLY,
                    default=P.empty if d is None else _Src(ast.unparse(d))))
    if a.kwarg:
        ps.append(P(a.kwarg.arg, P.VAR_KEYWORD))
    return inspect.Signature(ps)


def fallback_signature(obj, warns):
    """Signature for objects inspect cannot handle (e.g. Cython classes), or None."""
    name = getattr(obj, "__name__", "")
    ts = getattr(obj, "__text_signature__", None)
    if ts:
        sig = _sig_from_text(ts)
        if sig is not None:
            warns.append("signature: inspect.signature failed; used __text_signature__")
            return sig
    for line in (inspect.getdoc(obj) or "").splitlines():
        line = line.strip()
        if line:
            m = re.match(rf"^(?:\w+\.)*{re.escape(name)}(\(.*\))\s*$", line)
            if m:
                sig = _sig_from_text(m.group(1))
                if sig is not None:
                    warns.append("signature: inspect.signature failed; "
                                 "used signature line from docstring")
                    return sig
            break
    return None


def build_parameters(obj, kind, nd, warns):
    sig = None
    try:
        sig = inspect.signature(obj)
    except (TypeError, ValueError) as e:
        sig = fallback_signature(obj, warns)
        if sig is None:
            if nd is None or not nd["Parameters"]:
                warns.append(f"no signature retrievable ({e}); recorded with empty parameters")
                return "()", []
            warns.append("signature: inspect.signature failed; no text signature; "
                         "parameters taken from numpydoc Parameters section (documented_only)")
            sig = inspect.Signature([])
    sig = clean_sig(sig) if kind == "class" else sig
    constraints = getattr(obj, "_parameter_constraints", None) if kind == "class" else None

    docs = {}
    for p in section(nd, "Parameters"):
        pd = dict(p)
        if ":" in pd["name"] and not pd["type_doc"]:  # "name: type" without space before colon
            pd["name"], pd["type_doc"] = [x.strip() for x in pd["name"].split(":", 1)]
        for n in [x.strip() for x in pd["name"].split(",")]:
            docs[n.lstrip("*")] = dict(pd)
    params, sig_names = [], set()
    for p in sig.parameters.values():
        sig_names.add(p.name)
        d = docs.get(p.name, {})
        required = p.default is inspect.Parameter.empty and p.kind not in (
            inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
        default = None if p.default is inspect.Parameter.empty else repr(p.default)
        if default and " at 0x" in default:
            warns.append(f"parameter {p.name}: default repr contains a memory address")
        params.append({
            "name": p.name, "param_kind": PARAM_KINDS[p.kind],
            "required": required, "default": default,
            "effective_default": None, "type_doc": d.get("type_doc", ""), "description": d.get("description", ""),
            "allowed": allowed_for(p.name, d.get("type_doc", ""), constraints, warns),
        })
        if p.name not in docs and p.kind not in (
                inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
            warns.append(f"parameter {p.name}: not documented in docstring")
    if inspect.isclass(obj) and any(
            p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()):
        for base in obj.__mro__[1:]:
            init = base.__dict__.get("__init__")
            if init is None or base is object:
                continue
            try:
                bsig = clean_sig(inspect.signature(init))
            except (TypeError, ValueError):
                continue
            for p in bsig.parameters.values():
                if p.name in sig_names or p.name not in docs or p.kind in (
                        inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
                    continue
                sig_names.add(p.name)
                d = docs.get(p.name, {})
                required = p.default is inspect.Parameter.empty
                params.append({
                    "name": p.name, "param_kind": "keyword_only",
                    "required": required,
                    "default": None if required else repr(p.default),
                    "effective_default": None,
                    "type_doc": d.get("type_doc", ""),
                    "description": d.get("description", ""),
                    "allowed": allowed_for(p.name, d.get("type_doc", ""), constraints, warns),
                })
    for name, d in docs.items():
        if name in sig_names:
            continue
        default = default_from_doc(d["type_doc"])
        warns.append(f"parameter {name}: documented only (not in signature)"
                     + ("" if default is not None else "; no default= in type_doc"))
        params.append({
            "name": name, "param_kind": "documented_only", "required": False,
            "default": default, "effective_default": None, "type_doc": d["type_doc"],
            "description": d["description"],
            "allowed": allowed_for(name, d["type_doc"], constraints, warns),
        })
    return str(sig), params


def allowed_for(name, type_doc, constraints, warns):
    if constraints and name in constraints:
        return translate_constraints(constraints[name], warns, name)
    opts = docstring_options(type_doc)
    if opts:
        return {"source": "docstring", "options": opts, "intervals": [], "types": []}
    return {"source": "none", "options": [], "intervals": [], "types": []}


def property_attributes(cls, have):
    out = []
    for name in sorted(dir(cls)):
        if name.startswith("_") or name in have:
            continue
        prop = next((c.__dict__[name] for c in cls.__mro__ if name in c.__dict__), None)
        if not isinstance(prop, property):
            continue
        doc = inspect.getdoc(prop)
        if not doc:
            continue
        first = next((l.strip() for l in doc.splitlines() if l.strip()), "")
        out.append({"name": name, "type_doc": "", "description": first})
    return out


def build_methods(cls, warns):
    out = []
    for name in sorted(dir(cls)):
        if name.startswith("_"):
            continue
        try:
            m = getattr(cls, name)
        except Exception:
            continue
        if not callable(m) or isinstance(m, type):
            continue
        try:
            sig = str(clean_sig(inspect.signature(m)))
        except (TypeError, ValueError):
            sig = "(...)"
            warns.append(f"method {name}: signature unavailable")
        doc = inspect.getdoc(m) or ""
        first = next((l.strip() for l in doc.splitlines() if l.strip()), "")
        out.append({"name": name, "signature": f"{name}{sig}", "summary": first})
    return out


def extract_item(entry):
    warns = []
    obj = resolve(entry["import_path"])
    kind = entry.get("kind", "class")
    if kind == "class" and not inspect.isclass(obj):
        raise ExtractError(f"{entry['import_path']} is not a class")
    if kind == "function" and not callable(obj):
        raise ExtractError(f"{entry['import_path']} is not callable")
    doc = inspect.getdoc(obj)
    nd = parse_doc(doc, warns, "docstring")
    if kind == "class" and (nd is None or not nd["Parameters"]):
        init_nd = parse_doc(inspect.getdoc(obj.__init__), warns, "__init__ docstring")
        if init_nd is not None and init_nd["Parameters"]:
            nd = init_nd if nd is None else nd
            if not nd["Parameters"]:
                nd = init_nd
    sig_str, params = build_parameters(obj, kind, nd, warns)
    if not params and kind == "function":
        pass
    attributes = section(nd, "Attributes") if kind == "class" else []
    if kind == "class":
        attributes += property_attributes(obj, {a["name"] for a in attributes})
    returns = section(nd, "Returns") if kind == "function" else []
    if kind == "function" and not returns:
        warns.append("no Returns section found")
    name = getattr(obj, "__name__", entry.get("name", ""))
    return {
        "id": entry["id"], "import_path": entry["import_path"],
        "library": entry["library"],
        "library_version": package_version(entry["import_path"]),
        "kind": kind, "doc_url": entry.get("doc_url", ""),
        "summary": summary_of(nd, obj),
        "signature": f"{name}{sig_str}",
        "parameters": params, "attributes": attributes,
        "methods": build_methods(obj, warns) if kind == "class" else [],
        "returns": returns,
        "extractor_version": EXTRACTOR_VERSION,
        "overrides_applied": [], "warnings": warns,
    }


# ------------------------------------------------------------------ overrides

_SEG = re.compile(r"^(\w+)(?:\[(\w+)=([^\]]*)\])?$")


def split_path(path):
    parts, depth, cur = [], 0, ""
    for ch in path:
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
        if ch == "." and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return parts


def apply_patch(record, path, value, op="set"):
    """Apply one override patch. ``op``: set (default), append, remove."""
    if op not in ("set", "append", "remove"):
        raise ExtractError(f"invalid override op {op!r} for {path!r}")
    segs = split_path(path)
    node = record
    for i, seg in enumerate(segs):
        m = _SEG.match(seg)
        if not m:
            raise ExtractError(f"invalid override path {path!r}: bad segment {seg!r}")
        key, ffield, fval = m.groups()
        last = i == len(segs) - 1
        if not isinstance(node, dict) or key not in node:
            raise ExtractError(f"invalid override path {path!r}: no key {key!r}")
        if ffield is not None:
            lst = node[key]
            if not isinstance(lst, list):
                raise ExtractError(f"invalid override path {path!r}: {key!r} is not a list")
            hits = [x for x in lst if isinstance(x, dict) and str(x.get(ffield)) == fval]
            if len(hits) != 1:
                if last and op == "remove" and not hits:
                    raise ExtractError(f"cannot remove {path!r}: no such list entry")
                raise ExtractError(
                    f"invalid override path {path!r}: {seg!r} matches {len(hits)} entries")
            if last:
                if op != "remove":
                    raise ExtractError(f"invalid override path {path!r}: must end in a field")
                lst.remove(hits[0])
                return
            node = hits[0]
        elif last:
            if op == "remove":
                raise ExtractError(
                    f"invalid override path {path!r}: remove needs a list-entry selector")
            if op == "append":
                lst = node[key]
                if not isinstance(lst, list) or not isinstance(value, list):
                    raise ExtractError(
                        f"cannot append to {path!r}: path and value must both be lists")
                have = {x.get("name") for x in lst if isinstance(x, dict)}
                for v in value:
                    nm = v.get("name") if isinstance(v, dict) else None
                    if nm is not None and nm in have:
                        raise ExtractError(f"cannot append to {path!r}: {nm!r} already exists")
                    have.add(nm)
                lst.extend(value)
            else:
                node[key] = value
        else:
            node = node[key]
    if op == "remove":  # path had no segments matched as a selector
        raise ExtractError(f"invalid override path {path!r}")


def apply_overrides(record, overrides_dir):
    f = Path(overrides_dir) / f"{record['id']}.yaml"
    if not f.exists():
        return
    data = yaml.safe_load(f.read_text()) or {}
    for k in ("patches", "source_url", "reason"):
        if not data.get(k):
            raise ExtractError(f"override {f} missing {k!r}")
    for p in data["patches"]:
        op = p.get("op", "set") if isinstance(p, dict) else "set"
        if not isinstance(p, dict) or "path" not in p or (op != "remove" and "value" not in p):
            raise ExtractError(f"override {f}: each patch needs path and value")
        apply_patch(record, p["path"], p.get("value"), op)
        entry = {"path": p["path"], "source_url": data["source_url"], "reason": data["reason"]}
        if op != "set":
            entry["op"] = op
        record["overrides_applied"].append(entry)
        # fix 7: an overridden default makes the memory-address warning moot
        m = re.fullmatch(r"parameters\[name=(\w+)\]\.default", p["path"])
        if m and op == "set":
            drop = f"parameter {m.group(1)}: default repr contains a memory address"
            record["warnings"] = [w for w in record["warnings"] if w != drop]


# ----------------------------------------------------------------------- main

def write_record(record, out_root):
    d = Path(out_root) / record["library"]
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{record['id']}.json").write_text(
        json.dumps(record, indent=2, sort_keys=True, ensure_ascii=False) + "\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--library", action="append", default=[])
    ap.add_argument("--id", action="append", default=[])
    ap.add_argument("--inventory", action="append", default=[])
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--overrides-dir", default=None,
                    help="default: <out>/overrides")
    args = ap.parse_args(argv)

    inv = args.inventory or DEFAULT_INVENTORIES
    items = load_inventory(inv)
    if args.library:
        items = [i for i in items if i["library"] in args.library]
    if args.id:
        items = [i for i in items if i["id"] in args.id]
    ov_dir = args.overrides_dir or str(Path(args.out) / "overrides")

    written, nwarn, failures = 0, 0, []
    for entry in items:
        try:
            rec = extract_item(entry)
            apply_overrides(rec, ov_dir)
            write_record(rec, args.out)
        except Exception as e:
            failures.append((entry["id"], str(e)))
            print(f"FAIL {entry['id']}: {e}", file=sys.stderr)
            continue
        written += 1
        nwarn += len(rec["warnings"])
    print(f"items written: {written}; warnings: {nwarn}; failures: {len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
