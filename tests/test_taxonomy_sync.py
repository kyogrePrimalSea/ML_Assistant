"""docs/QUESTION_MAP.md section 6 and content/taxonomy.yaml agree on page placement (T034).

The markdown is parsed here independently of tools/gen_taxonomy.py. After T034 the YAML is
maintained directly, so this test will fail when only one of the two files is edited.
"""
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "docs/QUESTION_MAP.md"
TAX = ROOT / "content/taxonomy.yaml"

GOALS = {
    "R": {"predict-number"},
    "C": {"predict-category"},
    "TS": {"forecast"},
    "R·C": {"predict-number", "predict-category"},
    "R·TS": {"predict-number", "forecast"},
    "All": {"predict-number", "predict-category", "forecast"},
}


def parse_markdown():
    """{page id: (parent id, stage, shown_as, for set, pick_when)} from section 6."""
    text = MAP.read_text(encoding="utf-8")
    sec = text.split("\n## 6. ", 1)[1].split("\n## 7. ", 1)[0].splitlines()
    stage = parent = None
    pages = {}
    dupes = []
    for line in sec:
        m = re.match(r"### 6\.\d+ (\w+)", line)
        if m:
            stage, parent = m.group(1).lower(), None
            continue
        m = re.match(r"#### `([^`]+)`", line)
        if m:
            parent = m.group(1)
            continue
        if line.startswith("| `") and parent:
            cells = [c.strip() for c in line.strip()[1:-1].split("|")]
            if len(cells) != 4:
                continue  # a group-table row, not a page row
            pid = cells[0].strip("`")
            if pid in pages:
                dupes.append(pid)
            pages[pid] = (parent, stage, cells[1], GOALS[cells[2]], cells[3])
    assert not dupes, f"page listed twice in QUESTION_MAP.md: {dupes}"
    return pages


def parse_yaml():
    tax = yaml.safe_load(TAX.read_text(encoding="utf-8"))
    pages = {}

    def walk(node, stage):
        for p in node.get("pages", []):
            assert p["id"] not in pages, f"page twice in taxonomy.yaml: {p['id']}"
            pages[p["id"]] = (node["id"], stage, p["shown_as"], set(p["for"]), p["pick_when"])
        for ch in node.get("children", []):
            walk(ch, stage)

    for st in tax["stages"]:
        walk(st, st["id"])
    return pages


def test_page_sets_match():
    md, ym = parse_markdown(), parse_yaml()
    only_md = sorted(set(md) - set(ym))
    only_yaml = sorted(set(ym) - set(md))
    assert not only_md and not only_yaml, (
        f"pages only in QUESTION_MAP.md: {only_md}; pages only in taxonomy.yaml: {only_yaml}")


def test_placement_matches():
    md, ym = parse_markdown(), parse_yaml()
    bad = [f"{pid}: md (family/group, stage)={md[pid][:2]} yaml={ym[pid][:2]}"
           for pid in sorted(set(md) & set(ym)) if md[pid][:2] != ym[pid][:2]]
    assert not bad, "placement differs for: " + "; ".join(bad)


def test_shown_as_for_pick_when_match():
    md, ym = parse_markdown(), parse_yaml()
    bad = []
    for pid in sorted(set(md) & set(ym)):
        for i, field in ((2, "shown_as"), (3, "for"), (4, "pick_when")):
            if md[pid][i] != ym[pid][i]:
                bad.append(f"{pid}.{field}: md={md[pid][i]!r} yaml={ym[pid][i]!r}")
    assert not bad, "fields differ for: " + "; ".join(bad)


def test_343_pages():
    assert len(parse_markdown()) == 343
