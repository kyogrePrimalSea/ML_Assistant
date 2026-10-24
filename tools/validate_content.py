"""T011: validate content records (schema + referential integrity).

Usage: validate_content.py [--content DIR]
Schemas are read from the repo's content/schema. Errors print as `file: path: message`.
"""
import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "content" / "schema"


def load_yaml(p):
    return yaml.safe_load(Path(p).read_text())


def jpath(parts):
    return ".".join(str(x) for x in parts) or "(root)"


class Report:
    def __init__(self):
        self.errors = []

    def add(self, file, path, msg):
        self.errors.append((str(file), path, msg))


def load_inventory(content, rep):
    entries = []
    for name in ("catalogue", "supporting"):
        p = content / "inventory" / f"{name}.yaml"
        if p.exists():
            for e in (load_yaml(p) or {}).get("items", []):
                entries.append(e)
    return entries


def load_extraction(content, entry):
    p = content / "extraction" / entry["library"] / f"{entry['id']}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


LINE_LIMIT = 79


def validate(content, warnings=None):
    """Return (errors, stats). If `warnings` is a list, advisory (file, path, message) rows are appended."""
    content = Path(content)
    rep = Report()
    warns = warnings if warnings is not None else []
    vocab = load_yaml(SCHEMA / "vocab.yaml")
    item_v = Draft202012Validator(json.loads((SCHEMA / "item.schema.json").read_text()))
    q_v = Draft202012Validator(json.loads((SCHEMA / "question.schema.json").read_text()))
    stem_cap = {s["id"]: s["max_per_stage"] for s in vocab["question_stems"]}

    inv = load_inventory(content, rep)
    inv_by_id = {e["id"]: e for e in inv}
    inv_by_page = defaultdict(list)
    for e in inv:
        inv_by_page[e.get("page")].append(e)
    ext_cache = {}

    def ext(tid):
        if tid not in ext_cache:
            e = inv_by_id.get(tid)
            ext_cache[tid] = load_extraction(content, e) if e else None
        return ext_cache[tid]

    # ---- load records
    items = []  # (relfile, record)
    for p in sorted((content / "items").glob("**/*.yaml")):
        rel = p.relative_to(content)
        rec = load_yaml(p)
        errs = sorted(item_v.iter_errors(rec), key=lambda e: list(e.absolute_path))
        for e in errs:
            rep.add(rel, jpath(e.absolute_path), e.message)
        if errs or not isinstance(rec, dict):
            continue
        if p.stem != rec["id"]:
            rep.add(rel, "id", f"file name '{p.stem}' does not match id '{rec['id']}'")
        if p.parent.name != rec["stage"]:
            rep.add(rel, "stage", f"folder '{p.parent.name}' does not match stage '{rec['stage']}'")
        items.append((rel, rec))

    questions = []  # (relfile, filestage, q, index)
    for p in sorted((content / "questions").glob("*.yaml")):
        rel = p.relative_to(content)
        doc = load_yaml(p)
        errs = sorted(q_v.iter_errors(doc), key=lambda e: list(e.absolute_path))
        for e in errs:
            rep.add(rel, jpath(e.absolute_path), e.message)
        if errs:
            continue
        for i, q in enumerate(doc["questions"]):
            if q["stage"] != doc["stage"]:
                rep.add(rel, f"questions.{i}.stage", f"'{q['stage']}' differs from file stage '{doc['stage']}'")
            questions.append((rel, doc["stage"], q, i))

    rec_by_id = {}
    for rel, r in items:
        if r["id"] in rec_by_id:
            rep.add(rel, "id", f"duplicate id '{r['id']}'")
        rec_by_id[r["id"]] = (rel, r)
    page_ids = set(rec_by_id) | {e["page"] for e in inv if e.get("page")}
    q_by_id = {}
    for rel, _, q, i in questions:
        if q["id"] in q_by_id:
            rep.add(rel, f"questions.{i}.id", f"duplicate question id '{q['id']}'")
        q_by_id[q["id"]] = q
    families = {(e.get("stage"), e.get("family")) for e in inv}

    def page_ref(rel, path, pid):
        if pid not in page_ids:
            rep.add(rel, path, f"page '{pid}' is not an inventory page or content record")

    def long_lines(rel, path, tab, snippet):
        for n, line in enumerate(snippet.split("\n"), 1):
            if len(line) > LINE_LIMIT:
                warns.append((str(rel), path, f"{tab}, line {n} is {len(line)} characters (over {LINE_LIMIT})"))

    # ---- item checks
    for rel, r in items:
        s = r["slots"]
        ents = inv_by_page.get(r["id"], [])
        if ents:
            for field in ("stage", "family", "archetype"):
                for e in ents:
                    if e.get(field) != r[field]:
                        rep.add(rel, field, f"'{r[field]}' disagrees with inventory '{e.get(field)}' ({e['id']})")
                        break
            inv_tracks = set().union(*(set(e.get("tracks", [])) for e in ents))
            if inv_tracks != set(r["tracks"]):
                rep.add(rel, "tracks", f"{sorted(r['tracks'])} disagrees with inventory {sorted(inv_tracks)}")
        elif r["archetype"] not in ("hyperparameter", "output"):
            rep.add(rel, "id", f"'{r['id']}' is not an inventory page")

        for i, t in enumerate(r["targets"]):
            e = inv_by_id.get(t)
            if not e:
                rep.add(rel, f"targets.{i}", f"'{t}' not in inventory")
            else:
                if e.get("page") != r["id"]:
                    rep.add(rel, f"targets.{i}", f"'{t}' belongs to inventory page '{e.get('page')}'")
                if ext(t) is None:
                    rep.add(rel, f"targets.{i}", f"'{t}' has no extraction record")

        for field in ("pairs_with", "clashes", "applies_to"):
            for i, pid in enumerate(r.get(field, [])):
                page_ref(rel, f"{field}.{i}", pid)

        for i, p in enumerate(s["prep"]):
            st = p["step"]
            if "page" in st:
                page_ref(rel, f"slots.prep.{i}.step.page", st["page"])
            elif (st["stage"], st["family"]) not in families:
                rep.add(rel, f"slots.prep.{i}.step", f"no inventory family '{st['family']}' in stage '{st['stage']}'")

        for i, tab in enumerate(s["code"]):
            base = f"slots.code.{i}"
            if r["targets"] and tab["target"] not in r["targets"]:
                rep.add(rel, f"{base}.target", f"'{tab['target']}' is not in targets")
            elif not r["targets"] and tab["target"] not in inv_by_id:
                rep.add(rel, f"{base}.target", f"'{tab['target']}' not in inventory")
            pinned = r["library_versions"].get(tab["library"])
            if pinned is None:
                rep.add(rel, f"{base}.library", f"'{tab['library']}' missing from library_versions")
            first = tab["snippet"].split("\n", 1)[0]
            want = f"# {tab['library']} {pinned}"
            if pinned is not None and first.strip() != want:
                rep.add(rel, f"{base}.snippet", f"first line '{first}' should be '{want}'")
            e = ext(tab["target"])
            if e is not None and e.get("library_version") != pinned:
                rep.add(rel, f"{base}.snippet",
                        f"pinned version '{pinned}' differs from extraction record '{e.get('library_version')}'")
            long_lines(rel, f"{base}.snippet", f"code tab {i} ({tab['library']})", tab["snippet"])

        woc = s["what_comes_out"]
        if "items" in woc:
            pool = [t for t in r["targets"]]
            for pid in r.get("applies_to", []):
                pool += [e["id"] for e in inv_by_page.get(pid, [])]
            names = {"method": set(), "attribute": set()}
            for t in pool:
                x = ext(t)
                if x:
                    names["method"] |= {m["name"] for m in x.get("methods", [])}
                    names["attribute"] |= {a["name"] for a in x.get("attributes", [])}
            for i, it in enumerate(woc["items"]):
                if it["kind"] in names and it["name"] not in names[it["kind"]]:
                    rep.add(rel, f"slots.what_comes_out.items.{i}.name",
                            f"{it['kind']} '{it['name']}' is not in the extraction record of any target"
                            + (" or applies_to page" if r.get("applies_to") else ""))
            vis = woc["visual"]
            tt = set(r["rules"]["task_types"])
            need = {"proba_table": {"classification"}, "regression_preds": {"regression"},
                    "both": {"classification", "regression"}}.get(vis, set())
            if not need <= tt:
                rep.add(rel, "slots.what_comes_out.visual",
                        f"visual '{vis}' needs task types {sorted(need)} but rules.task_types is {sorted(tt)}")
            if "snippet" in woc:
                lib = woc["snippet_library"]
                pinned = r["library_versions"].get(lib)
                if pinned is None:
                    rep.add(rel, "slots.what_comes_out.snippet_library", f"'{lib}' missing from library_versions")
                else:
                    first = woc["snippet"].split("\n", 1)[0]
                    if first.strip() != f"# {lib} {pinned}":
                        rep.add(rel, "slots.what_comes_out.snippet",
                                f"first line '{first}' should be '# {lib} {pinned}'")
                long_lines(rel, "slots.what_comes_out.snippet", "what comes out", woc["snippet"])
        for lib, ver in r["library_versions"].items():
            for t in r["targets"]:
                e = inv_by_id.get(t)
                x = ext(t) if e else None
                if x and e["library"] == lib and x.get("library_version") != ver:
                    rep.add(rel, f"library_versions.{lib}",
                            f"'{ver}' differs from extraction record of {t} ('{x.get('library_version')}')")

        param_names = set()
        for t in r["targets"]:
            x = ext(t)
            if x:
                param_names |= {p["name"] for p in x.get("parameters", [])}
        for tier in ("tier1", "tier2", "tier3"):
            for i, k in enumerate(s["key_settings"][tier]):
                path = f"slots.key_settings.{tier}.{i}"
                if r["targets"] and k["name"] not in param_names:
                    rep.add(rel, f"{path}.name", f"'{k['name']}' is not a parameter of any target")
                if k["page"] is not None:
                    page_ref(rel, f"{path}.page", k["page"])

        qf = s["quick_facts"]
        if "values" in qf:
            got = [v["page"] for v in qf["values"]]
            for i, pid in enumerate(got):
                page_ref(rel, f"slots.quick_facts.values.{i}.page", pid)
            if r["archetype"] != "hyperparameter":
                rep.add(rel, "slots.quick_facts.values", "only hyperparameter pages carry per-page values")
            elif set(got) != set(r.get("applies_to", [])):
                rep.add(rel, "slots.quick_facts.values",
                        f"pages {sorted(set(got))} differ from applies_to {sorted(r.get('applies_to', []))}")

        intu = s["intuition"]
        for i, v in enumerate(intu.get("vs_siblings", []) if isinstance(intu, dict) else []):
            page_ref(rel, f"slots.intuition.vs_siblings.{i}.page", v["page"])
        for i, qid in enumerate(s["next"]):
            if qid not in q_by_id:
                rep.add(rel, f"slots.next.{i}", f"question '{qid}' does not exist")

    # ---- question checks
    counts = Counter()
    for rel, fstage, q, i in questions:
        for tr in q["tracks"]:
            counts[(q["stage"], q["stem"], tr)] += 1
        if q["stem"] == "we_need_but" and not q["text"].startswith("We need"):
            rep.add(rel, f"questions.{i}.text", "a 'we_need_but' text must start with 'We need'")
        for j, a in enumerate(q["answers"]):
            path = f"questions.{i}.answers.{j}"
            page_ref(rel, f"{path}.page", a["page"])
            if "note" in a and len(a["note"].split()) > 16:
                rep.add(rel, f"{path}.note", "note is longer than 16 words")
            if "setting" in a and a["page"] in page_ids:
                names = set()
                if a["page"] in rec_by_id:
                    ks = rec_by_id[a["page"]][1]["slots"]["key_settings"]
                    names |= {k["name"] for t in ks.values() for k in t}
                for e in inv_by_page.get(a["page"], []):
                    x = ext(e["id"])
                    if x:
                        names |= {pm["name"] for pm in x.get("parameters", [])}
                if a["setting"] not in names:
                    rep.add(rel, f"{path}.setting",
                            f"'{a['setting']}' is not in key_settings or the extraction parameters of '{a['page']}'")
        for j, n in enumerate(q["next"]):
            if n not in q_by_id:
                rep.add(rel, f"questions.{i}.next.{j}", f"question '{n}' does not exist")
    # Cap is counted per track: a stage view shows one track's questions at a time.
    first_file = {}
    for rel, _, q, _ in questions:
        for tr in q["tracks"]:
            first_file.setdefault((q["stage"], q["stem"], tr), rel)
    for (stage, stem, tr), n in sorted(counts.items()):
        if n > stem_cap.get(stem, 7):
            rep.add(first_file[(stage, stem, tr)], "questions",
                    f"{n} questions for stem '{stem}' in stage '{stage}' (track '{tr}') exceeds cap {stem_cap.get(stem, 7)}")

    reviewed = sum(1 for _, r in items if r["reviewed"])
    return rep.errors, {"records": len(items), "reviewed": reviewed,
                        "unreviewed": len(items) - reviewed, "questions": len(questions)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--content", default=str(ROOT / "content"))
    args = ap.parse_args(argv)
    warnings = []
    errors, stats = validate(args.content, warnings)
    for f, p, m in errors:
        print(f"{f}: {p}: {m}")
    if warnings:
        print(f"warnings ({len(warnings)}, do not affect the exit code):")
        for f, p, m in warnings:
            print(f"  {f}: {p}: {m}")
    print(f"records: {stats['records']} (reviewed {stats['reviewed']}, unreviewed {stats['unreviewed']}); "
          f"questions: {stats['questions']}; errors: {len(errors)}; warnings: {len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
