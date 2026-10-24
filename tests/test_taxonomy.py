"""T035: goal_view (tools/taxonomy.py) on the real taxonomy and on small synthetic trees."""
import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from tools.taxonomy import goal_view, load_taxonomy, node_text, page_placement, walk_view

TAX = load_taxonomy()
R, C, TS = "predict-number", "predict-category", "forecast"


def stage(goal, sid):
    return next(s for s in goal_view(TAX, goal) if s["id"] == sid)


def kids(goal, sid):
    return [(c["id"], c["level"]) for c in stage(goal, sid)["children"]]


def test_clean_opens_straight_to_its_pages():
    # Clean has one family; the family is elided and its four pages hang from the stage
    assert kids(C, "clean") == [(p, "page") for p in
                                ["simpleimputer", "knnimputer", "iterativeimputer", "missingindicator"]]


def test_transform_c_shows_five_groups():
    assert kids(C, "transform") == [(g, "group") for g in
                                    ["transform.scale", "transform.encode", "transform.create",
                                     "transform.rebalance", "transform.chain"]]
    assert len(stage(C, "transform")["children"][3]["children"]) == 7  # rebalance families


def test_model_c_shows_seven_children():
    got = kids(C, "model")
    assert got == [("model.linear", "group"), ("model.awkward", "group"), ("model.trees", "group"),
                   ("model.neighbours", "group"), ("model.probabilistic", "group"),
                   ("mlp-classifier", "page"), ("dummyclassifier", "page")]  # one-page groups collapse to the page


def test_model_r_six_and_ts_four():
    assert len(kids(R, "model")) == 6
    assert [i for i, _ in kids(TS, "model")] == ["model.ts-past", "model.ts-smooth", "model.ts-multi",
                                                "model.ts-changing"]


def test_stages_always_stay_even_when_empty():
    stages = goal_view(TAX, TS)
    assert [s["id"] for s in stages] == [s["id"] for s in TAX["stages"]]
    assert stage(TS, "interpret")["children"] == []


def test_goal_filters_pages():
    ids = {n["id"] for n, _ in walk_view(goal_view(TAX, R))}
    assert "xgboost" in ids and "smote" not in ids and "stl" not in ids


def test_no_view_breaks_the_shape_rules():
    for g in (R, C, TS):
        for node, _ in walk_view(goal_view(TAX, g)):
            assert len(node["children"]) <= 7, (g, node["id"])
            if node["level"] in ("group", "family"):
                assert len(node["children"]) != 1, (g, node["id"])


def test_node_text_picks_the_goal_entry():
    model = next(s for s in TAX["stages"] if s["id"] == "model")
    assert node_text(model["question_label"], R) == "Predict the number"
    assert node_text(model["question_label"], TS) == "Make the forecast"
    assert node_text("same for all", C) == "same for all"
    assert stage(C, "model")["question_prompt"] == "How should we predict the category?"
    assert node_text({"predict-number": "x"}, TS) is None


def page(pid, goals=(R, C, TS)):
    return {"id": pid, "shown_as": pid, "for": list(goals), "pick_when": "when"}


def fam(fid, pages, level="family"):
    return {"id": fid, "level": level, "names_label": "n", "question_label": "q", "question_sentence": "We need",
            "question_prompt": None, "for": [R, C, TS], "pages": pages}


def tiny(children):
    t = copy.deepcopy(TAX)
    for s in t["stages"]:
        s["children"] = [fam(f"{s['id']}.x", [page(f"{s['id']}-p")])]
    t["stages"][5]["children"] = children
    return t


def test_elision_family_with_one_page_is_replaced_by_the_page():
    v = goal_view(tiny([fam("model.a", [page("p1")]), fam("model.b", [page("p2"), page("p3")])]), R)
    assert [(c["id"], c["level"]) for c in v[5]["children"]] == [("p1", "page"), ("model.b", "family")]


def test_elision_stage_with_one_family_takes_its_pages():
    v = goal_view(tiny([fam("model.a", [page("p1"), page("p2")])]), R)
    assert [(c["id"], c["level"]) for c in v[5]["children"]] == [("p1", "page"), ("p2", "page")]


def test_elision_repeats_through_nested_levels():
    inner = fam("model.g.f", [page("p1"), page("p2")])
    group = {"id": "model.g", "level": "group", "names_label": "n", "question_label": "q",
             "question_sentence": "We need", "question_prompt": None, "for": [R, C, TS], "children": [inner]}
    other = fam("model.o", [page("p3"), page("p4")])
    v = goal_view(tiny([group, other]), R)
    # group -> its single family is removed, leaving group with two pages; stays because it has two children
    assert [(c["id"], c["level"], [x["id"] for x in c["children"]]) for c in v[5]["children"]] == [
        ("model.g", "group", ["p1", "p2"]), ("model.o", "family", ["p3", "p4"])]
    # a goal that keeps only one page of the group collapses the whole chain to that page
    t = tiny([group, other])
    t["stages"][5]["children"][0]["children"][0]["pages"][1]["for"] = [C]
    v = goal_view(t, R)
    assert [c["id"] for c in v[5]["children"]] == ["p1", "model.o"]


def test_groups_and_families_without_pages_for_the_goal_are_dropped():
    v = goal_view(tiny([fam("model.a", [page("p1", [C])]), fam("model.b", [page("p2"), page("p3")])]), R)
    assert [c["id"] for c in v[5]["children"]] == ["p2", "p3"]


def test_page_placement_names_the_owning_node():
    pl = page_placement(TAX)
    assert pl["xgboost"] == ("model", "model.trees.boosting", [R, C])
    assert pl["mlp-classifier"][1] == "model.neural"  # group with pages directly
    assert len(pl) == 343
