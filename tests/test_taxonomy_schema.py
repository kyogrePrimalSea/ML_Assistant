"""content/taxonomy.yaml validates against its schema (T034)."""
import copy
import json
from pathlib import Path

import jsonschema
import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "content/schema/taxonomy.schema.json").read_text(encoding="utf-8"))
TAXONOMY = yaml.safe_load((ROOT / "content/taxonomy.yaml").read_text(encoding="utf-8"))


def errors(doc):
    return list(jsonschema.Draft202012Validator(SCHEMA).iter_errors(doc))


def pages(node):
    out = list(node.get("pages", []))
    for ch in node.get("children", []):
        out += pages(ch)
    return out


def test_schema_is_valid():
    jsonschema.Draft202012Validator.check_schema(SCHEMA)


def test_taxonomy_validates():
    assert [e.message for e in errors(TAXONOMY)] == []


def test_nine_stages_in_order():
    assert [s["id"] for s in TAXONOMY["stages"]] == [
        "explore", "clean", "transform", "select", "split", "model", "tune", "evaluate",
        "interpret"]


def test_343_pages_each_once():
    ids = [p["id"] for s in TAXONOMY["stages"] for p in pages(s)]
    assert len(ids) == 343
    assert len(set(ids)) == 343


def test_schema_rejects_bad_documents():
    bad = copy.deepcopy(TAXONOMY)
    bad["stages"][0], bad["stages"][1] = bad["stages"][1], bad["stages"][0]
    assert errors(bad), "stage order must be enforced"

    bad = copy.deepcopy(TAXONOMY)
    bad["stages"][0]["children"][0]["for"] = ["regression"]
    assert errors(bad), "unknown goal id must be rejected"

    bad = copy.deepcopy(TAXONOMY)
    del bad["stages"][0]["children"][0]["pages"][0]["pick_when"]
    assert errors(bad), "page needs pick_when"

    bad = copy.deepcopy(TAXONOMY)
    model = next(s for s in bad["stages"] if s["id"] == "model")
    g = next(c for c in model["children"] if "pages" in c)
    g["children"] = []
    assert errors(bad), "group with both pages and children must be rejected"
