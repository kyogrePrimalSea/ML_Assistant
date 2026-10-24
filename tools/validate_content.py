"""T011: validate content records (schema + referential integrity).

Usage: validate_content.py [--content DIR]
Schemas are read from the repo's content/schema. Errors print as `file: path: message`.
"""
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

try:
    from tools.taxonomy import goal_view, node_text, page_placement, source_nodes, walk_view
except ImportError:  # run as `python tools/validate_content.py`
    from taxonomy import goal_view, node_text, page_placement, source_nodes, walk_view

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


def find_todos(node, path=()):
    """Paths of every string that holds the word TODO (the scaffolder's placeholder)."""
    if isinstance(node, str):
        return [jpath(path)] if re.search(r"\bTODO\b", node) else []
    if isinstance(node, dict):
        return [t for k, v in node.items() for t in find_todos(v, path + (k,))]
    if isinstance(node, list):
        return [t for i, v in enumerate(node) for t in find_todos(v, path + (i,))]
    return []


LINE_LIMIT = 79
MAX_CHILDREN = 7


def load_exceptions(content):
    """content/taxonomy-exceptions.yaml: {exceptions: [{rule, node, reason, [goal]}]}; missing means none."""
    p = Path(content) / "taxonomy-exceptions.yaml"
    if not p.exists():
        return [], []
    doc = load_yaml(p) or {}
    bad, out = [], []
    for i, e in enumerate(doc.get("exceptions") or []):
        if not isinstance(e, dict) or not {"rule", "node", "reason"} <= set(e) or not all(
                isinstance(e[k], str) and e[k] for k in ("rule", "node", "reason")):
            bad.append(("taxonomy-exceptions.yaml", f"exceptions.{i}", "needs string keys rule, node and reason"))
        else:
            out.append(e)
    return out, bad


def goal_text_checks(field, text):
    """Yield (rule, message) for one text, given its field name and value. Rules are section 2 of the map."""
    if text is None:
        return
    if "&" in text or "!" in text:
        yield "forbidden-characters", f"{field} '{text}' has '&' or '!'"
    if field == "question_prompt":
        if not text.endswith("?"):
            yield field, f"question_prompt '{text}' does not end in '?'"
        if len(text) > 48:
            yield field, f"question_prompt '{text}' is {len(text)} characters (limit 48)"
    elif field == "question_label" and len(text) > 40:
        yield field, f"question_label '{text}' is {len(text)} characters (limit 40)"
    elif field == "question_sentence":
        if not text.startswith(("We need", "We have")):
            yield field, f"question_sentence '{text}' does not start with 'We need' or 'We have'"
        if len(text) > 110:
            yield field, f"question_sentence '{text}' is {len(text)} characters (limit 110)"
    elif field == "pick_when" and len(text) > 60:
        yield field, f"pick_when '{text}' is {len(text)} characters (limit 60)"


def taxonomy_checks(content, tax, report):
    """Rules on the taxonomy alone. `report(rule, node, message, goal=None)` records a violation."""
    goals = [g["id"] for g in tax["goals"]]
    # label limits on every text, resolved per goal
    def texts(node, node_id):
        for field in ("question_prompt", "question_label", "question_sentence"):
            if field in node:
                seen = set()
                for g in goals:
                    t = node_text(node[field], g)
                    if t is not None and t not in seen:
                        seen.add(t)
                        for rule, msg in goal_text_checks(field, t):
                            report(rule, node_id, msg)
    texts(tax["root"], "root")
    for rule, msg in goal_text_checks("question_prompt", tax["goal_prompt"]):
        report(rule, "goal_prompt", msg)
    for g in tax["goals"]:
        for field in ("question_label", "question_sentence"):
            for rule, msg in goal_text_checks(field, g[field]):
                report(rule, g["id"], msg)
    for g in tax["later_goals"]:
        for rule, msg in goal_text_checks("question_label", g["question_label"]):
            report(rule, g["id"], msg)
    for node, _ in source_nodes(tax):
        texts(node, node["id"])
        for p in node.get("pages", []):
            for rule, msg in goal_text_checks("pick_when", p["pick_when"]):
                report(rule, p["id"], msg)
    # shape of every goal view
    for g in goals:
        for node, parent in walk_view(goal_view(tax, g)):
            n = len(node["children"])
            if n > MAX_CHILDREN:
                report("max-children", node["id"], f"{node['level']} '{node['id']}' has {n} children in goal "
                       f"'{g}' (limit {MAX_CHILDREN})", g)
            if node["level"] in ("group", "family") and n == 1:
                report("single-child", node["id"], f"{node['level']} '{node['id']}' has a single child in goal '{g}'", g)


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

    # ---- taxonomy (T035): schema, exceptions, rules on the taxonomy alone
    tax_path = content / "taxonomy.yaml"
    tax = None
    exceptions, bad_exc = load_exceptions(content)
    for f, p_, m in bad_exc:
        rep.add(f, p_, m)
    used_exc = set()

    def tax_report(rule, node, message, goal=None):
        for i, e in enumerate(exceptions):
            if e["rule"] == rule and e["node"] == node and e.get("goal") in (None, goal):
                used_exc.add(i)
                warns.append(("taxonomy.yaml", node, f"{message} (allow-listed: {e['reason']})"))
                return
        rep.add("taxonomy.yaml", node, f"[{rule}] {message}")

    if not tax_path.exists():
        rep.add("taxonomy.yaml", "(root)", "file is missing")
    else:
        tax = load_yaml(tax_path)
        tax_errs = sorted(Draft202012Validator(json.loads((SCHEMA / "taxonomy.schema.json").read_text()))
                          .iter_errors(tax), key=lambda e: list(e.absolute_path))
        for e in tax_errs:
            rep.add("taxonomy.yaml", jpath(e.absolute_path), e.message)
        if tax_errs:
            tax = None
    place = page_placement(tax) if tax else {}
    tax_nodes = {n["id"]: n for n, _ in source_nodes(tax)} if tax else {}
    tax_goals = {g["id"]: g for g in tax["goals"]} if tax else {}

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
        todos = find_todos(rec)
        if todos:  # unfinished draft (T042): report the placeholders only, not the errors they cause
            for path in todos:
                rep.add(rel, path, "unfinished: TODO placeholder")
            continue
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
    families = {n["id"] for n in tax_nodes.values() if n.get("pages")}

    def page_ref(rel, path, pid):
        if pid not in page_ids:
            rep.add(rel, path, f"page '{pid}' is not an inventory page or content record")

    def long_lines(rel, path, tab, snippet):
        for n, line in enumerate(snippet.split("\n"), 1):
            if len(line) > LINE_LIMIT:
                warns.append((str(rel), path, f"{tab}, line {n} is {len(line)} characters (over {LINE_LIMIT})"))

    # ---- taxonomy coverage and rules (QUESTION_MAP section 3, rule 9)
    if tax:
        content_only = {rid for rid, (_, r) in rec_by_id.items() if rid not in {e.get("page") for e in inv}}
        want = {e["page"] for e in inv if e.get("page")} | content_only
        listed = Counter(p["id"] for n, _ in source_nodes(tax) for p in n.get("pages", []))
        for pid in sorted(want - set(listed)):
            rep.add("taxonomy.yaml", pid, "page is in the inventory or content records but not in the taxonomy")
        for pid in sorted(set(listed) - want):
            rep.add("taxonomy.yaml", pid, "page is in the taxonomy but not in the inventory or content records")
        for pid, n in sorted(listed.items()):
            if n > 1:
                rep.add("taxonomy.yaml", pid, f"page appears {n} times in the taxonomy")
        taxonomy_checks(content, tax, tax_report)
        for i, e in enumerate(exceptions):
            if i not in used_exc:
                warns.append(("taxonomy-exceptions.yaml", f"exceptions.{i}",
                              f"allow-list entry ({e['rule']}, {e['node']}) matches no violation"))

    # ---- item checks
    for rel, r in items:
        s = r["slots"]
        ents = inv_by_page.get(r["id"], [])
        if ents:
            # Stage and family come from the taxonomy (checked below); the inventory only keeps the
            # archetype, and its tracks must be covered (the taxonomy may widen them).
            for e in ents:
                if e.get("archetype") != r["archetype"]:
                    rep.add(rel, "archetype", f"'{r['archetype']}' disagrees with inventory '{e.get('archetype')}' ({e['id']})")
                    break
            inv_tracks = set().union(*(set(e.get("tracks", [])) for e in ents))
            if not inv_tracks <= set(r["tracks"]):
                rep.add(rel, "tracks", f"{sorted(r['tracks'])} misses inventory tracks {sorted(inv_tracks - set(r['tracks']))}")
        elif r["archetype"] not in ("hyperparameter", "output"):
            rep.add(rel, "id", f"'{r['id']}' is not an inventory page")

        pl = place.get(r["id"])
        if tax and pl:
            t_stage, t_family, t_for = pl
            if r["stage"] != t_stage:
                rep.add(rel, "stage", f"'{r['stage']}' differs from taxonomy stage '{t_stage}'")
            if r["family"] != t_family:
                rep.add(rel, "family", f"'{r['family']}' differs from taxonomy family '{t_family}'")
            for g in t_for:
                goal = tax_goals[g]
                if goal["track"] not in r["tracks"]:
                    rep.add(rel, "tracks", f"{sorted(r['tracks'])} lacks track '{goal['track']}' "
                            f"of goal '{g}' that the taxonomy lists for this page")
                tts = r["rules"]["task_types"]
                if tts and goal["task"] not in tts:
                    tax_report("task-types", r["id"], f"rules.task_types {tts} lacks task '{goal['task']}' "
                               f"of goal '{g}' that the taxonomy lists for this page", g)

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
            elif st["family"] not in families:
                rep.add(rel, f"slots.prep.{i}.step", f"'{st['family']}' is not a taxonomy family or group with pages")

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
                elif q["stem"] == "we_need_but":
                    targets = (rec_by_id[a["page"]][1]["targets"] if a["page"] in rec_by_id
                               else [e["id"] for e in inv_by_page.get(a["page"], [])])
                    params = set()
                    for t in targets:
                        x = ext(t)
                        if x:
                            params |= {pm["name"] for pm in x.get("parameters", [])}
                    if a["setting"] not in params:
                        rep.add(rel, f"{path}.setting",
                                f"'{a['setting']}' is not a parameter in the extraction of any target of '{a['page']}'")
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
