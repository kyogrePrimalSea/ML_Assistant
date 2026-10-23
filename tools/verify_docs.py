#!/usr/bin/env python3
"""Cross-check extraction records against the official Sphinx API pages.

For each ``content/extraction/<library>/<id>.json`` the item's ``doc_url`` is
fetched (cached), the documented signature parameters (names, defaults) and
attributes are parsed from the HTML, and compared with the extraction record.
Results go to ``content/extraction/verification/<library>.json``.

Standard library only. Layout that cannot be parsed gives status ``unparsed``;
a match is never guessed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urldefrag

ROOT = Path(__file__).resolve().parent.parent
EXTRACTION_DIR = ROOT / "content" / "extraction"
VERIFICATION_DIR = EXTRACTION_DIR / "verification"
DEFAULT_CACHE = ROOT / ".cache" / "docs"
USER_AGENT = "MLFieldGuideDocsCheck/0.1 (personal project; docs cross-check)"
MIN_INTERVAL = 0.5  # seconds between requests (<= 2 requests/second)

# --------------------------------------------------------------------------
# Minimal DOM
# --------------------------------------------------------------------------

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = attrs or {}
        self.children = []  # Node or str
        self.parent = parent

    @property
    def classes(self):
        return set(self.attrs.get("class", "").split())

    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return "".join(out)

    def elems(self):
        return [c for c in self.children if isinstance(c, Node)]

    def find_all(self, tag=None, cls=None):
        """All descendants matching tag and/or class (document order)."""
        res = []
        for c in self.elems():
            if (tag is None or c.tag == tag) and (cls is None or cls in c.classes):
                res.append(c)
            res.extend(c.find_all(tag, cls))
        return res


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, {k: (v or "") for k, v in attrs}, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, {k: (v or "") for k, v in attrs}, self.cur)
        self.cur.children.append(n)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse_html(html: str) -> Node:
    b = _Builder()
    b.feed(html)
    return b.root


# --------------------------------------------------------------------------
# Signature parsing
# --------------------------------------------------------------------------

def split_top_level(s: str) -> list[str]:
    """Split on commas outside brackets and quotes."""
    parts, depth, quote, cur = [], 0, None, []
    i = 0
    while i < len(s):
        ch = s[i]
        if quote:
            cur.append(ch)
            if ch == "\\" and i + 1 < len(s):
                cur.append(s[i + 1])
                i += 1
            elif ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
            cur.append(ch)
        elif ch in "([{":
            depth += 1
            cur.append(ch)
        elif ch in ")]}":
            depth -= 1
            cur.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    if "".join(cur).strip():
        parts.append("".join(cur))
    return [p.strip() for p in parts]


def split_default(piece: str):
    """Split 'name[: annotation][ = default]' at the first top-level '='."""
    depth, quote = 0, None
    for i, ch in enumerate(piece):
        if quote:
            if ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "=" and depth == 0:
            return piece[:i].strip(), piece[i + 1:].strip()
    return piece.strip(), None


def parse_signature(dt: Node):
    """Return [(name, default_or_None)] for a ``dt.sig`` element, or None."""
    # Prefer the text between sig-paren spans; the "[source]" link follows.
    spans = dt.find_all("span", "sig-paren")
    if len(spans) < 2:
        # No parentheses at all (``class X[source]``): empty parameter set.
        if not spans and dt.find_all("span", "sig-name"):
            return []
        return None
    # Collect text strictly between first "(" span and last ")" span.
    first, last = spans[0], spans[-1]
    out, started = [], False

    def walk(n):
        nonlocal started
        for c in n.children:
            if c is first:
                started = True
                continue
            if c is last:
                return True
            if isinstance(c, str):
                if started:
                    out.append(c)
            elif walk(c):
                return True
        return False

    walk(dt)
    text = re.sub(r"\s+", " ", "".join(out)).strip()
    params = []
    for piece in split_top_level(text):
        if piece in ("*", "/"):
            continue
        left, default = split_default(piece)
        raw = left.split(":", 1)[0].strip()
        name = raw.lstrip("*").strip()
        if not re.fullmatch(r"[A-Za-z_]\w*", name):
            return None
        params.append((name, default, raw.startswith("*")))
    return params


def normalise_default(d):
    """Normalise a default's text: strip whitespace and surrounding quotes."""
    if d is None:
        return None
    d = d.strip()
    if len(d) >= 2 and d[0] == d[-1] and d[0] in "'\"":
        d = d[1:-1]
    d = d.replace("'", "").replace('"', "")
    d = re.sub(r"\s+", "", d)
    # 1.0 vs 1.00 style differences are not tolerated except plain numbers
    try:
        f = float(d)
        if f == int(f) and "." not in d and "e" not in d.lower():
            return d
        return repr(f)
    except (ValueError, OverflowError):
        return d


# --------------------------------------------------------------------------
# Page section location and parsing
# --------------------------------------------------------------------------

def find_section(root: Node, anchor: str | None):
    """Return (dt, dd) of the documented object, or None."""
    dts = [d for d in root.find_all("dt", "sig") if d.attrs.get("id")]
    target = None
    if anchor:
        for d in dts:
            if d.attrs["id"] == anchor:
                target = d
                break
        if target is None:
            return None
    else:
        for dl in root.find_all("dl"):
            if dl.classes & {"class", "function", "exception"} and "py" in dl.classes:
                for c in dl.elems():
                    if c.tag == "dt" and "sig" in c.classes:
                        target = c
                        break
                if target:
                    break
    if target is None:
        return None
    dl = target.parent
    kids = dl.elems()
    idx = kids.index(target)
    dd = kids[idx + 1] if idx + 1 < len(kids) and kids[idx + 1].tag == "dd" else None
    return target, dd


def _field_list_items(dl: Node, field_name: str):
    """Names in the direct field-list entry called ``field_name``."""
    names = []
    kids = dl.elems()
    for i, k in enumerate(kids):
        if k.tag == "dt" and k.text().strip().rstrip(":").strip() == field_name:
            if i + 1 < len(kids) and kids[i + 1].tag == "dd":
                dd = kids[i + 1]
                for dl2 in dd.elems():
                    if dl2.tag != "dl":
                        continue
                    for dt in dl2.elems():
                        if dt.tag == "dt":
                            nm = _entry_name(dt)
                            if nm:
                                names.append(nm)
    return names


def _entry_name(dt: Node):
    """Name of a field-list ``dt``: ``<strong>name</strong>`` or, for
    property-backed attributes, ``<code class="xref">name</code>``."""
    for n in dt.find_all():
        if n.tag == "strong" or (n.tag == "code" and "xref" in n.classes):
            return n.text().strip()
    return None


_LITERAL = (r"'[^']*'|\"[^\"]*\"|-?\d[\w.+-]*|None|True|False|np\.\w+")
_DEFAULT_RE = re.compile(r"\bdefault(?:\s*[=:]\s*|\s+)(?:is\s+)?(" + _LITERAL + r")")


def default_from_text(text: str):
    """Default from a 'default=...' / 'default ...' / '(default: ...)' phrase."""
    m = _DEFAULT_RE.search(text)
    if not m:
        return None
    val = m.group(1)
    if val.endswith(".") and not val.endswith(("'.", '".')) and len(val) > 1:
        val = val[:-1]
    return val


def parse_parameter_section(dd: Node | None):
    """{name: text} from the object's own Parameters field-list entry.

    Handles both Sphinx renderings: ``ul > li`` ("name (type) - description")
    and ``dl > dt`` ("name : type, default=x" with a following ``dd``).
    Only direct children are read, so nested method sections are ignored.
    """
    found = {}
    if dd is None:
        return found
    for fl in dd.elems():
        if not (fl.tag == "dl" and "field-list" in fl.classes):
            continue
        kids = fl.elems()
        for i, k in enumerate(kids):
            if not (k.tag == "dt" and k.text().strip().rstrip(":").strip() == "Parameters"):
                continue
            if i + 1 >= len(kids) or kids[i + 1].tag != "dd":
                continue
            body = kids[i + 1]
            for c in body.elems():
                if c.tag == "ul":
                    items = [(li, li.text()) for li in c.elems() if li.tag == "li"]
                elif c.tag == "dl":
                    items = []
                    ck = c.elems()
                    for j, d in enumerate(ck):
                        if d.tag == "dt":
                            extra = ck[j + 1].text() if j + 1 < len(ck) and ck[j + 1].tag == "dd" else ""
                            items.append((d, d.text() + " " + extra))
                else:
                    items = [(c, c.text())] if c.tag == "p" else []
                for node, text in items:
                    strong = next((x for x in node.find_all("strong")), None)
                    if strong is not None:
                        stext = strong.text()
                        if ":" in stext:  # malformed "name:type" (no space before colon)
                            stext = stext.split(":", 1)[0]
                        for nm in stext.split(","):
                            nm = nm.strip().lstrip("*").strip()
                            if nm:
                                found.setdefault(nm, text)
    return found


def parse_attributes(dd: Node | None):
    """Attribute names documented for a class (field list + attribute/property dls)."""
    names = []
    if dd is None:
        return names
    kids = dd.elems()
    for i, c in enumerate(kids):
        if c.tag == "dl" and "field-list" in c.classes:
            names.extend(_field_list_items(c, "Attributes"))
        if c.tag == "dl" and "py" in c.classes and c.classes & {"attribute", "property"}:
            for dt in c.elems():
                if dt.tag == "dt" and dt.attrs.get("id"):
                    names.append(dt.attrs["id"].rsplit(".", 1)[-1])
        # autosummary table under a "Properties" rubric (statsmodels)
        if (c.tag == "p" and "rubric" in c.classes
                and c.text().strip() == "Properties"):
            for t in kids[i + 1:i + 2]:
                for row in t.find_all("tr"):
                    td = next((x for x in row.elems() if x.tag == "td"), None)
                    code = next(iter(td.find_all("code")), None) if td else None
                    if code is not None and code.text().strip():
                        names.append(code.text().strip())
    seen = []
    for n in names:
        if n not in seen:
            seen.append(n)
    return seen


def parse_page(html: str, doc_url: str):
    """Parse an API page. Returns dict(parameters={name:default}, attributes=[...])
    or None when the layout cannot be parsed."""
    anchor = urldefrag(doc_url)[1] or None
    root = parse_html(html)
    sec = find_section(root, anchor)
    if sec is None:
        return None
    dt, dd = sec
    sig = parse_signature(dt)
    if sig is None:
        return None
    parameters = {n: d for n, d, _ in sig}
    var_names = {n for n, _, star in sig if star}
    unknown_default = set()
    # Union with the Parameters section; signature defaults win.
    for name, text in parse_parameter_section(dd).items():
        if name in parameters:
            continue
        d = default_from_text(text)
        parameters[name] = d
        if d is None:
            unknown_default.add(name)
    return {
        "parameters": parameters,
        "param_order": list(parameters),
        "var_names": var_names,
        "unknown_default": unknown_default,
        "attributes": parse_attributes(dd),
    }


# --------------------------------------------------------------------------
# Comparison
# --------------------------------------------------------------------------

def compare(record: dict, parsed: dict) -> dict:
    ext_params = {p["name"]: p for p in record.get("parameters", [])}
    docs_params = parsed["parameters"]
    var_names = parsed.get("var_names", set())
    unknown = parsed.get("unknown_default", set())
    ext_has_var = any(p.get("param_kind", "").startswith("var_") for p in ext_params.values())
    missing_in_extraction = [n for n in docs_params if n not in ext_params
                             and not (n in var_names and ext_has_var)]
    missing_in_docs = [n for n, p in ext_params.items() if n not in docs_params
                       and not p.get("param_kind", "").startswith("var_")]
    default_mismatches = []
    for n, d in docs_params.items():
        if n not in ext_params or n in unknown or n in var_names:
            continue
        p = ext_params[n]
        ext_default = None if p.get("required") else p.get("default")
        eff = p.get("effective_default")
        nd = normalise_default(d)
        if nd != normalise_default(ext_default) and not (eff is not None and nd == normalise_default(eff)):
            default_mismatches.append({"name": n, "docs": d, "extraction": ext_default})

    ext_attrs = [a["name"] for a in record.get("attributes", [])]
    docs_attrs = parsed["attributes"]
    attribute_diff = {
        "missing_in_extraction": [a for a in docs_attrs if a not in ext_attrs],
        "missing_in_docs": [a for a in ext_attrs if a not in docs_attrs],
    }
    # Attributes are only compared when the page documents some.
    if not docs_attrs:
        attribute_diff["missing_in_docs"] = []
        attribute_diff["note"] = "page lists no attributes; not compared"
    bad = (missing_in_extraction or missing_in_docs or default_mismatches
           or attribute_diff["missing_in_extraction"] or attribute_diff["missing_in_docs"])
    return {
        "status": "mismatch" if bad else "match",
        "missing_in_extraction": missing_in_extraction,
        "missing_in_docs": missing_in_docs,
        "default_mismatches": default_mismatches,
        "attribute_diff": attribute_diff,
    }


def verify_record(record: dict, html: str | None, fetch_error: str | None = None) -> dict:
    out = {"id": record["id"], "doc_url": record.get("doc_url"), "status": "unparsed",
           "missing_in_extraction": [], "missing_in_docs": [],
           "default_mismatches": [], "attribute_diff": {}}
    if html is None:
        out["status"] = "fetch_error"
        out["error"] = fetch_error or "no content"
        return out
    try:
        parsed = parse_page(html, record.get("doc_url", ""))
    except Exception as exc:  # parser must never crash the run
        out["error"] = f"parse failure: {exc}"
        return out
    if parsed is None:
        out["error"] = "page layout not recognised"
        return out
    out.update(compare(record, parsed))
    return out


# --------------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------------

class Fetcher:
    def __init__(self, cache_dir: Path, retries: int = 3):
        self.cache_dir = Path(cache_dir)
        self.retries = retries
        self._last = 0.0

    def _path(self, url):
        key = hashlib.sha1(url.encode()).hexdigest()[:16]
        return self.cache_dir / f"{key}.html"

    def get(self, doc_url: str):
        """Return (html, error). The URL fragment is dropped for fetching."""
        url = urldefrag(doc_url)[0]
        path = self._path(url)
        if path.exists():
            return path.read_text(encoding="utf-8"), None
        err = None
        for attempt in range(self.retries):
            wait = MIN_INTERVAL - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=60) as r:
                    html = r.read().decode("utf-8", errors="replace")
                self.cache_dir.mkdir(parents=True, exist_ok=True)
                path.write_text(html, encoding="utf-8")
                return html, None
            except urllib.error.HTTPError as e:
                err = f"HTTP {e.code}"
                if e.code in (404, 410):
                    break
            except Exception as e:
                err = f"{type(e).__name__}: {e}"
            time.sleep(2 ** attempt)
        return None, err


# --------------------------------------------------------------------------
# Driver
# --------------------------------------------------------------------------

def load_records(extraction_dir: Path, library=None, item_id=None):
    for lib_dir in sorted(p for p in extraction_dir.iterdir() if p.is_dir()):
        if lib_dir.name in ("verification", "overrides"):
            continue
        if library and lib_dir.name != library:
            continue
        for f in sorted(lib_dir.glob("*.json")):
            rec = json.loads(f.read_text(encoding="utf-8"))
            if item_id and rec.get("id") != item_id:
                continue
            yield lib_dir.name, rec


def run(extraction_dir=EXTRACTION_DIR, out_dir=VERIFICATION_DIR, cache=DEFAULT_CACHE,
        library=None, item_id=None, fetcher=None):
    fetcher = fetcher or Fetcher(cache)
    results: dict[str, list] = {}
    for lib, rec in load_records(Path(extraction_dir), library, item_id):
        html, err = fetcher.get(rec["doc_url"]) if rec.get("doc_url") else (None, "no doc_url")
        results.setdefault(lib, []).append(verify_record(rec, html, err))
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for lib, items in results.items():
        (out_dir / f"{lib}.json").write_text(json.dumps(items, indent=2) + "\n", encoding="utf-8")
    return results


def summary_table(results: dict) -> str:
    cols = ["match", "mismatch", "unparsed", "fetch_error"]
    lines = [f"{'library':<18}" + "".join(f"{c:>13}" for c in cols)]
    for lib, items in sorted(results.items()):
        counts = {c: sum(1 for i in items if i["status"] == c) for c in cols}
        lines.append(f"{lib:<18}" + "".join(f"{counts[c]:>13}" for c in cols))
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--library", help="library slug filter")
    ap.add_argument("--id", dest="item_id", help="item id filter")
    ap.add_argument("--cache", default=str(DEFAULT_CACHE), help="page cache directory")
    args = ap.parse_args(argv)
    results = run(cache=Path(args.cache), library=args.library, item_id=args.item_id)
    if not results:
        print("No extraction records found.")
        return 0
    print(summary_table(results))
    return 0


if __name__ == "__main__":
    sys.exit(main())
