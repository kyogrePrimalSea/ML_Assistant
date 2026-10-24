"""T035: taxonomy helpers shared by the validator and the relationship derivation.

`goal_view(taxonomy, goal_id)` is the reference for T037's layout script (a JS mirror); the
algorithm is documented in docs/CONTENT_SCHEMA.md ("Goal views").
"""
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def load_taxonomy(path=None):
    return yaml.safe_load(Path(path or ROOT / "content" / "taxonomy.yaml").read_text(encoding="utf-8"))


def node_text(value, goal_id):
    """A node's text for a goal: the string itself, or the map entry for that goal (None if absent)."""
    if isinstance(value, dict):
        return value.get(goal_id)
    return value


def _children(node):
    """Child nodes of a source node: families/groups under `children`, or pages under `pages`."""
    return node.get("children") if "children" in node else node.get("pages", [])


def _build(node, goal_id, level):
    """Copy one source node for a goal, keeping only pages whose `for` has the goal.

    Returns None when a group or family is left with no pages (stages are never dropped).
    """
    if level == "page":
        if goal_id not in node["for"]:
            return None
        return {"id": node["id"], "level": "page", "shown_as": node["shown_as"],
                "pick_when": node["pick_when"], "children": []}
    kids = []
    for ch in _children(node):
        built = _build(ch, goal_id, ch.get("level", "page"))
        if built is not None:
            kids.append(built)
    if not kids and level != "stage":
        return None
    out = {"id": node["id"], "level": level, "children": kids}
    for key in ("names_label", "question_label", "question_sentence", "question_prompt"):
        if key in node:
            out[key] = node_text(node[key], goal_id)
    return out


def _elide(node):
    """One bottom-up pass of the no-single-child rule. Returns True when anything changed."""
    changed = False
    for ch in node["children"]:
        changed |= _elide(ch)
    new = []
    for ch in node["children"]:
        # a group or family with exactly one page child is replaced by that page
        if ch["level"] in ("group", "family") and len(ch["children"]) == 1 and ch["children"][0]["level"] == "page":
            new.append(ch["children"][0])
            changed = True
        else:
            new.append(ch)
    node["children"] = new
    # a group or stage with exactly one family/group child takes that child's children directly
    if node["level"] in ("stage", "group") and len(node["children"]) == 1 \
            and node["children"][0]["level"] in ("group", "family"):
        node["children"] = node["children"][0]["children"]
        changed = True
    return changed


def goal_view(taxonomy, goal_id):
    """The tree for one goal after filtering and elision: a list of the nine stage nodes.

    Every node is {id, level, children, ...texts resolved for the goal}; page leaves carry
    `shown_as` and `pick_when`. Stages always stay, even when empty.
    """
    stages = [_build(s, goal_id, "stage") for s in taxonomy["stages"]]
    for st in stages:
        while _elide(st):
            pass
    return stages


def walk_view(nodes, parent=None):
    """Yield (node, parent) for every node of a goal view, depth first."""
    for n in nodes:
        yield n, parent
        yield from walk_view(n["children"], n)


def source_nodes(taxonomy):
    """Yield (node, stage_id) for every stage, group and family of the taxonomy."""
    def rec(n, stage):
        yield n, stage
        for ch in n.get("children", []):
            yield from rec(ch, stage)
    for s in taxonomy["stages"]:
        yield from rec(s, s["id"])


def page_placement(taxonomy):
    """{page id: (stage id, family-or-group id, [goal ids])}; the parent node is the owner of the page."""
    out = {}
    for n, stage in source_nodes(taxonomy):
        for p in n.get("pages", []):
            out.setdefault(p["id"], (stage, n["id"], list(p["for"])))
    return out
