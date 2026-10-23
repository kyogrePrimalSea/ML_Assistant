"""Checks for both inventory files (a file is skipped if absent)."""
import importlib
from pathlib import Path

import pytest
import yaml

INV = Path(__file__).resolve().parent.parent / "content" / "inventory"
FILES = ["catalogue.yaml", "supporting.yaml"]

LIBRARIES = {"scikit-learn", "statsmodels", "scipy", "xgboost", "lightgbm",
             "imbalanced-learn", "optuna", "shap"}
KINDS = {"class", "function"}
STAGES = {"explore", "clean", "transform", "select", "split", "model", "tune",
          "evaluate", "interpret"}
TRACKS = {"standard", "unsupervised", "time-series", "causal", "deep-learning"}
ARCHETYPES = {"transformer", "resampler", "selector", "splitter", "model",
              "hyperparameter", "tuning", "metric", "diagnostic", "output", "composer"}
GROUPINGS = {"catalogue", "proposed"}
SOURCES = {"catalogue", "supporting"}
TIERS = {"core", "extended"}
REQUIRED = ["id", "name", "library", "import_path", "kind", "stage", "family", "tracks",
            "archetype", "doc_url", "page", "page_grouping", "source", "tier", "notes"]


def load(fname):
    path = INV / fname
    if not path.exists():
        return None
    return yaml.safe_load(path.read_text())["items"]


def all_entries():
    out = []
    for f in FILES:
        for e in load(f) or []:
            out.append((f, e))
    return out


def resolve(path):
    parts = path.split(".")
    for i in range(len(parts), 0, -1):
        try:
            obj = importlib.import_module(".".join(parts[:i]))
        except ImportError:
            continue
        for a in parts[i:]:
            obj = getattr(obj, a)
        return obj
    raise ImportError(path)


ENTRIES = all_entries()
if not ENTRIES:
    pytest.skip("no inventory files present", allow_module_level=True)

PARAMS = [pytest.param(f, e, id=f"{f}:{e.get('id')}") for f, e in ENTRIES]


@pytest.mark.parametrize("fname,e", PARAMS)
def test_required_fields(fname, e):
    missing = [k for k in REQUIRED if k not in e]
    assert not missing, missing
    for k in ("id", "name", "import_path", "family", "page", "doc_url"):
        assert isinstance(e[k], str) and e[k].strip(), k


@pytest.mark.parametrize("fname,e", PARAMS)
def test_enums(fname, e):
    assert e["library"] in LIBRARIES
    assert e["kind"] in KINDS
    assert e["stage"] in STAGES
    assert e["archetype"] in ARCHETYPES
    assert e["page_grouping"] in GROUPINGS
    assert e["source"] in SOURCES
    assert e["tier"] in TIERS
    assert isinstance(e["tracks"], list) and e["tracks"]
    assert set(e["tracks"]) <= TRACKS
    assert e["page"] == e["page"].lower() and " " not in e["page"] and "_" not in e["page"]
    assert fname.startswith(e["source"])


@pytest.mark.parametrize("fname,e", PARAMS)
def test_doc_url_https(fname, e):
    assert e["doc_url"].startswith("https://")


@pytest.mark.parametrize("fname,e", PARAMS)
def test_import_path_imports(fname, e):
    obj = resolve(e["import_path"])
    assert callable(obj)


def test_catalogue_items_are_core():
    for f, e in ENTRIES:
        if f == "catalogue.yaml":
            assert e["tier"] == "core"


def test_ids_unique_across_files():
    ids = [e["id"] for _, e in ENTRIES]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, dupes


def test_no_id_in_both_files():
    a = {e["id"] for e in load("catalogue.yaml") or []}
    b = {e["id"] for e in load("supporting.yaml") or []}
    assert not (a & b), a & b
