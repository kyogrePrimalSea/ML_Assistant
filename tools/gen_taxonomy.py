"""Generate content/taxonomy.yaml from docs/QUESTION_MAP.md (T034).

Run once. After that the YAML is maintained directly (docs/ARCHITECTURE.md,
"Taxonomy"). Wording is copied exactly; nothing is shortened or fixed.
Inconsistencies are printed to stderr as WARNING lines, never fixed.

Usage: .venv/bin/python tools/gen_taxonomy.py
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "QUESTION_MAP.md"
OUT = ROOT / "content" / "taxonomy.yaml"

GOAL_ORDER = ["predict-number", "predict-category", "forecast"]
CODES = {
    "R": ["predict-number"],
    "C": ["predict-category"],
    "TS": ["forecast"],
    "R·C": ["predict-number", "predict-category"],
    "R·TS": ["predict-number", "forecast"],
    "All": list(GOAL_ORDER),
}
STAGE_IDS = ["explore", "clean", "transform", "select", "split", "model", "tune",
             "evaluate", "interpret"]
MAP_KEY = re.compile(r"^(R·C|R·TS|R|C|TS):\s+(.*)$")

warnings = []


def warn(msg):
    warnings.append(msg)
    print("WARNING: " + msg, file=sys.stderr)


class Flow(list):
    pass


def dump(data):
    class D(yaml.SafeDumper):
        pass
    D.add_representer(Flow, lambda d, v: d.represent_sequence(
        "tag:yaml.org,2002:seq", v, flow_style=True))
    D.add_representer(dict, lambda d, v: d.represent_mapping(
        "tag:yaml.org,2002:map", v.items()))
    return yaml.dump(data, Dumper=D, sort_keys=False, allow_unicode=True, width=10**6)


def cells(line):
    # No cell in the map contains a literal pipe, so a plain split is safe.
    return [p.strip() for p in line.strip()[1:-1].split("|")]


def strip_ticks(s):
    return s.strip().strip("`")


def codes(s):
    if s not in CODES:
        raise SystemExit(f"unknown For code {s!r}")
    return Flow(CODES[s])


def text_or_map(s):
    """'R: a · C: b' -> {predict-number: a, predict-category: b}; else the string.
    A blank cell is None."""
    s = s.strip()
    if not s:
        return None
    parts = s.split(" · ")
    if all(MAP_KEY.match(p) for p in parts):
        out = {}
        for p in parts:
            code, txt = MAP_KEY.match(p).groups()
            for g in CODES[code]:
                out[g] = txt
        return out
    return s


def union_for(nodes):
    seen = set()
    for n in nodes:
        seen.update(n["for"])
    return Flow([g for g in GOAL_ORDER if g in seen])


def parse_pages(block):
    pages = []
    for ln in block:
        if ln.startswith("| `"):
            c = cells(ln)
            pages.append({"id": strip_ticks(c[0]), "shown_as": c[1],
                          "for": codes(c[2]), "pick_when": c[3]})
    return pages


def main():
    lines = SRC.read_text(encoding="utf-8").splitlines()

    def section_range(start_re, end_re):
        s = next(i for i, l in enumerate(lines) if re.match(start_re, l))
        e = next((i for i in range(s + 1, len(lines)) if re.match(end_re, lines[i])),
                 len(lines))
        return s, e

    # ---- section 4: goals
    s, e = section_range(r"## 4\.", r"## 5\.")
    sec = lines[s:e]
    goal_prompt = next(l for l in sec if l.startswith("**Top bar prompt**:"))
    goal_prompt = goal_prompt.split(":", 1)[1].strip()
    goals, later = [], []
    for l in sec:
        if l.startswith("| `"):
            c = cells(l)
            if len(c) == 6:
                goals.append({"id": strip_ticks(c[0]), "question_label": c[1],
                              "names_label": c[2], "question_sentence": c[3],
                              "track": c[4], "task": c[5]})
            elif len(c) == 3:
                later.append({"id": strip_ticks(c[0]), "question_label": c[1],
                              "names_label": c[2]})
    # field order per packet: id, question_label, names_label, ...
    # ---- section 5: stages
    s, e = section_range(r"## 5\.", r"## 6\.")
    sec = lines[s:e]
    root_prompt = next(l for l in sec if l.startswith("**Centre prompt at the root"))
    root_prompt = root_prompt.split(":**", 1)[1].strip() if ":**" in root_prompt \
        else root_prompt.split(":", 1)[1].strip()
    stage_rows = {}
    for l in sec:
        if l.startswith("| ") and not l.startswith("| ---") and not l.startswith("| Stage"):
            c = cells(l)
            stage_rows[c[0]] = c
    stages = []
    for sid in STAGE_IDS:
        c = stage_rows[sid]
        stages.append({"id": sid, "names_label": c[1],
                       "question_label": text_or_map(c[2]),
                       "question_sentence": c[3],
                       "question_prompt": text_or_map(c[4]),
                       "children": []})

    # ---- section 6
    s, e = section_range(r"## 6\.", r"## 7\.")
    sec = lines[s:e]
    stage_idx = {}
    for i, l in enumerate(sec):
        m = re.match(r"### 6\.\d+ (\w+)", l)
        if m:
            stage_idx[m.group(1).lower()] = i
    bounds = sorted(stage_idx.items(), key=lambda kv: kv[1])
    for n, (name, start) in enumerate(bounds):
        end = bounds[n + 1][1] if n + 1 < len(bounds) else len(sec)
        block = sec[start:end]
        stage = next(st for st in stages if st["id"] == name)
        parse_stage(stage, block)

    out = {
        "version": 1,
        "source": "docs/QUESTION_MAP.md",
        "root": {"question_prompt": root_prompt},
        "goal_prompt": goal_prompt,
        "goals": goals,
        "later_goals": later,
        "stages": stages,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(dump(out), encoding="utf-8")
    n_pages = sum(1 for _ in iter_pages(stages))
    print(f"wrote {OUT.relative_to(ROOT)}: {n_pages} pages, {len(warnings)} warnings")


def iter_pages(stages):
    def walk(node):
        for p in node.get("pages", []):
            yield p
        for ch in node.get("children", []):
            yield from walk(ch)
    for st in stages:
        yield from walk(st)


def parse_stage(stage, block):
    sid = stage["id"]
    # group table, if any
    groups = {}
    order = []
    for l in block:
        if l.startswith("| `") and len(cells(l)) == 6:
            c = cells(l)
            gid = strip_ticks(c[0])
            groups[gid] = {
                "id": gid, "level": "group", "names_label": c[1],
                "question_label": text_or_map(c[2]),
                "question_sentence": text_or_map(c[3]),
                "question_prompt": text_or_map(c[4]),
                "for": codes(c[5]),
                "_table_for": c[5],
            }
            order.append(gid)
    # headings
    heads = [i for i, l in enumerate(block) if l.startswith("#### `")]
    families = []
    for n, i in enumerate(heads):
        j = heads[n + 1] if n + 1 < len(heads) else len(block)
        sub = block[i:j]
        h = sub[0]
        m = re.match(r"#### `([^`]+)` \(group with pages directly\)", h)
        if m:
            groups[m.group(1)]["pages"] = parse_pages(sub)
            continue
        m = re.match(r"#### `([^`]+)` · (.+) · (.+) · (R·TS|R·C|All|TS|R|C)$", h)
        if not m:
            raise SystemExit(f"unparsed heading: {h}")
        fid, names, qlabel, f = m.groups()
        sentence_line = next(l for l in sub[1:] if l.startswith("*"))
        sm = re.match(r"^\*(.+?)\*(?: Prompt: (.+?))?(?: \(.*\))?$", sentence_line)
        if not sm:
            raise SystemExit(f"unparsed sentence line: {sentence_line}")
        fam = {"id": fid, "level": "family", "names_label": names,
               "question_label": qlabel, "question_sentence": sm.group(1),
               "question_prompt": sm.group(2), "for": codes(f),
               "pages": parse_pages(sub)}
        fam["_heading_for"] = f
        families.append(fam)

    def check_for(node, kids, table_code):
        u = union_for(kids)
        if list(node["for"]) != list(u):
            warn(f"{node['id']}: `For` {table_code} ({list(node['for'])}) disagrees "
                 f"with union of its children/pages ({list(u)})")

    for fam in families:
        check_for(fam, fam["pages"], fam.pop("_heading_for"))
    if groups:
        for fam in families:
            gid = fam["id"].rsplit(".", 1)[0]
            if gid not in groups:
                raise SystemExit(f"family {fam['id']} has no group {gid}")
            groups[gid].setdefault("children", []).append(fam)
        for gid in order:
            g = groups[gid]
            kids = g.get("children") or g.get("pages")
            check_for(g, kids, g.pop("_table_for"))
            stage["children"].append(g)
    else:
        stage["children"] = families


if __name__ == "__main__":
    main()
