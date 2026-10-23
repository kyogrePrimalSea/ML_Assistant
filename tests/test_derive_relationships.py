"""T011: relationship derivation from the fixture content tree."""
import json
import shutil
from pathlib import Path

import pytest
import yaml

from tools.derive_relationships import derive, main

FIX = Path(__file__).resolve().parent / "fixtures" / "content" / "valid"


@pytest.fixture
def tree(tmp_path):
    dst = tmp_path / "content"
    shutil.copytree(FIX, dst)
    return dst


def rels(tree):
    return {(r["source"], r["target"], r["type"]) for r in derive(tree)}


def test_needs_from_required_family_step(tree):
    r = rels(tree)
    assert ("xgboost", "one-hot-encoder", "needs") in r


def test_recommended_page_and_family_steps(tree):
    r = rels(tree)
    assert ("xgboost", "train-test-split", "recommended") in r
    assert ("xgboost", "class-weighting", "recommended") in r


def test_clashes_from_not_needed_and_field(tree):
    r = rels(tree)
    assert {("xgboost", "standard-scaler", "clashes"), ("xgboost", "min-max-scaler", "clashes"),
            ("xgboost", "simple-imputer", "clashes")} <= r
    p = tree / "items/model/xgboost.yaml"
    d = yaml.safe_load(p.read_text())
    d["clashes"] = ["lightgbm"]
    p.write_text(yaml.safe_dump(d, sort_keys=False))
    assert ("xgboost", "lightgbm", "clashes") in rels(tree)


def test_alternative_to_same_stage_and_family(tree):
    r = rels(tree)
    assert ("decision-tree-regressor", "random-forest", "alternative_to") in r  # Trees
    assert ("random-forest", "decision-tree-regressor", "alternative_to") not in r  # once, sorted
    assert not any(t == "alternative_to" and "xgboost" in (s, d) for s, d, t in r)  # alone in family


def test_pairs_with(tree):
    assert ("treeexplainer", "xgboost", "pairs_with") in rels(tree)  # sorted pair


def test_all_five_types(tree):
    assert {t for _, _, t in rels(tree)} == {"needs", "recommended", "clashes", "alternative_to", "pairs_with"}


def test_no_self_edges_and_unique(tree):
    out = derive(tree)
    assert all(r["source"] != r["target"] for r in out)
    keys = [(r["source"], r["target"], r["type"], r["via"]) for r in out]
    assert len(keys) == len(set(keys))


def test_deterministic_order(tree):
    out = derive(tree)
    assert out == derive(tree)
    keys = [(r["source"], r["target"], r["type"], r["via"]) for r in out]
    assert keys == sorted(keys)
    assert set(out[0]) == {"source", "target", "type", "via"}


def test_family_step_via(tree):
    via = {(r["source"], r["target"], r["type"]): r["via"] for r in derive(tree)}
    assert via[("xgboost", "one-hot-encoder", "needs")] == "prep:transform/Categorical encoding"
    assert via[("xgboost", "train-test-split", "recommended")] == "prep"


def test_main_writes_file(tree, capsys):
    assert main(["--content", str(tree)]) == 0
    data = json.loads((tree / "derived" / "relationships.json").read_text())
    assert data == derive(tree)
