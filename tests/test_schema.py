"""T010: content schema, vocabulary and worked examples."""
import json
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "content" / "schema"
FIX = Path(__file__).resolve().parent / "fixtures" / "schema"

SLOT_ORDER = ["header", "solves", "quick_facts", "use_avoid", "prep", "code",
              "what_comes_out", "catch_outs", "key_settings", "watch_it_work", "intuition", "next"]
VOCAB_LISTS = ["stages", "tracks", "archetypes", "relationship_types", "prep_statuses",
               "severities", "toy_datasets", "question_stems", "shape_effects", "libraries"]


def load_json(p):
    return json.loads(Path(p).read_text())


def load_yaml(p):
    return yaml.safe_load(Path(p).read_text())


@pytest.fixture(scope="module")
def vocab():
    return load_yaml(SCHEMA / "vocab.yaml")


@pytest.fixture(scope="module")
def item_validator():
    return Draft202012Validator(load_json(SCHEMA / "item.schema.json"))


@pytest.fixture(scope="module")
def question_validator():
    return Draft202012Validator(load_json(SCHEMA / "question.schema.json"))


@pytest.mark.parametrize("name", ["item.schema.json", "question.schema.json"])
def test_schema_is_valid_metaschema(name):
    Draft202012Validator.check_schema(load_json(SCHEMA / name))


def test_vocab_has_required_lists(vocab):
    for k in VOCAB_LISTS:
        assert vocab[k], k
    assert set(vocab["data_profile"]) == {"task_type", "track", "has_categoricals",
                                          "has_missing", "time_ordered", "imbalanced"}
    assert [s["id"] for s in vocab["stages"]] == [
        "explore", "clean", "transform", "select", "split", "model", "tune", "evaluate", "interpret"]
    assert len(vocab["archetypes"]) == 11
    assert {t["wave"] for t in vocab["tracks"]} == {1, "later"}
    assert {r["id"] for r in vocab["relationship_types"]} == {
        "needs", "recommended", "clashes", "alternative_to", "pairs_with"}
    assert [s["id"] for s in vocab["severities"]] == ["block", "warn", "tip", "valid"]
    assert [s["id"] for s in vocab["prep_statuses"]] == ["required", "recommended", "not_needed"]
    assert {s["id"] for s in vocab["question_stems"]} == {"my_data_is", "my_model_is", "i_want_to_know", "we_need_but"}
    for s in vocab["stages"]:
        assert s["icon"].startswith("ti-") and s["dark"] and s["light"]
    for a in vocab["archetypes"]:
        assert a["icon"].startswith("ti-")


def test_schema_enums_match_vocab(vocab):
    item = load_json(SCHEMA / "item.schema.json")
    p = item["properties"]
    ids = lambda k: [x["id"] for x in vocab[k]]
    assert p["stage"]["enum"] == ids("stages")
    assert p["archetype"]["enum"] == ids("archetypes")
    assert p["tracks"]["items"]["enum"] == ids("tracks")
    d = item["$defs"]
    assert d["dataset"]["enum"] == ids("toy_datasets")
    assert d["code_tab"]["properties"]["library"]["enum"] == vocab["libraries"]
    assert d["condition"]["properties"]["task_type"]["items"]["enum"] == vocab["data_profile"]["task_type"]["values"]
    assert set(d["condition"]["properties"]) == set(vocab["data_profile"])
    assert d["prep_entry"]["properties"]["status"]["enum"] == ids("prep_statuses")
    assert p["rules"]["properties"]["shape_effect"]["properties"]["rows"]["enum"] == vocab["shape_effects"]
    assert list(p["slots"]["properties"]) == SLOT_ORDER
    q = load_json(SCHEMA / "question.schema.json")
    assert q["$defs"]["question"]["properties"]["stem"]["enum"] == ids("question_stems")
    assert q["$defs"]["question"]["properties"]["stage"]["enum"] == ids("stages")


@pytest.mark.parametrize("name", ["xgboost.yaml", "max-depth.yaml"])
def test_worked_example_validates(item_validator, name):
    rec = load_yaml(FIX / name)
    errors = sorted(item_validator.iter_errors(rec), key=lambda e: list(e.path))
    assert not errors, [(list(e.path), e.message) for e in errors]
    assert list(rec["slots"]) == SLOT_ORDER  # fixed slot order
    assert rec["reviewed"] is False
    for tab in rec["slots"]["code"]:  # stamp derived from library_versions
        stamp = f"# {tab['library']} {rec['library_versions'][tab['library']]}"
        assert tab["snippet"].splitlines()[0] == stamp


def test_questions_example_validates(question_validator):
    rec = load_yaml(FIX / "questions-model.yaml")
    assert not list(question_validator.iter_errors(rec))


def _xgb():
    return load_yaml(FIX / "xgboost.yaml")


def test_missing_slot_rejected(item_validator):
    rec = _xgb()
    del rec["slots"]["next"]
    assert list(item_validator.iter_errors(rec))


def test_empty_slots_explicit(item_validator):
    rec = _xgb()
    rec["slots"].update(solves={"none": True}, quick_facts={"none": True}, prep=[], code=[],
                        what_comes_out={"none": True}, catch_outs=[], watch_it_work={"none": True}, intuition={"none": True}, next=[])
    assert not list(item_validator.iter_errors(rec))


def test_header_holds_no_data(item_validator):
    rec = _xgb()
    rec["slots"]["header"] = {"plain_name": "XGBoost"}
    assert list(item_validator.iter_errors(rec))


def test_hero_must_match_archetype(item_validator):
    rec = _xgb()
    rec["slots"]["solves"]["hero"] = {"kind": "metric", "dataset": "ames", "highlight": ["TP"]}
    assert list(item_validator.iter_errors(rec))


def test_applies_to_only_for_hyperparameter_and_output(item_validator):
    rec = _xgb()
    rec["applies_to"] = ["ridge"]
    assert list(item_validator.iter_errors(rec))
    hp = load_yaml(FIX / "max-depth.yaml")
    del hp["applies_to"]
    assert list(item_validator.iter_errors(hp))


def test_model_needs_targets(item_validator):
    rec = _xgb()
    rec["targets"] = []
    assert list(item_validator.iter_errors(rec))


def test_prep_why_word_limit_and_status(item_validator):
    rec = _xgb()
    rec["slots"]["prep"][0]["why"] = "one two three four five six seven eight nine ten eleven twelve thirteen"
    assert list(item_validator.iter_errors(rec))
    rec = _xgb()
    rec["slots"]["prep"][0]["status"] = "maybe"
    assert list(item_validator.iter_errors(rec))


def test_snippet_needs_version_stamp(item_validator):
    rec = _xgb()
    rec["slots"]["code"][0]["snippet"] = "from xgboost import XGBRegressor\n"
    assert list(item_validator.iter_errors(rec))


def test_rich_learning_fields_are_optional_but_non_empty(item_validator):
    rec = _xgb()
    tab = rec["slots"]["code"][0]
    tab["output"] = "y_pred: [1.0]\n"
    rec["slots"]["what_comes_out"] = {
        "items": [{"name": "prediction", "kind": "return", "task": None,
                   "shape": "scalar", "note": "One prediction.",
                   "object_type": "float", "example": "1.0",
                   "shape_explanation": "A scalar is one value with no array dimensions."}],
        "next_step": None,
        "guidance": [{"task": "regression", "text": "Interpret one prediction per row."}],
        "snippet": "# xgboost 3.4.1\nprint(1.0)\n",
        "snippet_library": "xgboost",
        "output": "1.0\n",
        "visual": None,
    }
    setting = rec["slots"]["key_settings"]["tier1"][0]
    setting.update(controls="The number of boosting rounds.",
                   effect="More rounds can fit more detail, but can overfit.")
    intuition = rec["slots"]["intuition"]
    intuition.update(
        goal="Fit the target while controlling tree complexity.",
        steps=["Add one tree at a time."],
        math={
            "notation": [{"symbol": "f", "meaning": "One tree."}],
            "equations": [{"expression": "y = f(x)", "meaning": "The tree predicts from x."}],
            "prediction": "The ensemble adds the tree outputs.",
        },
    )
    assert not list(item_validator.iter_errors(rec))

    tab["output"] = ""
    rec["slots"]["what_comes_out"]["output"] = ""
    rec["slots"]["what_comes_out"]["items"][0]["object_type"] = ""
    rec["slots"]["what_comes_out"]["items"][0]["shape_explanation"] = ""
    rec["slots"]["what_comes_out"]["guidance"] = []
    intuition["steps"] = []
    assert list(item_validator.iter_errors(rec))


def test_unknown_field_rejected(item_validator):
    rec = _xgb()
    rec["extra"] = 1
    assert list(item_validator.iter_errors(rec))


def test_composer_intuition_accepts_legacy_and_rich_model_forms(item_validator):
    rec = _xgb()
    rec["archetype"] = "composer"
    rec["slots"]["solves"]["hero"] = {"kind": "composer", "boxes": ["Model A", "Model B"]}
    rec["slots"]["quick_facts"] = {"none": True}

    rec["slots"]["intuition"] = {"text": "Combines models."}
    assert not list(item_validator.iter_errors(rec))

    rec["slots"]["intuition"] = {
        "idea": "A final model learns from held-out predictions.",
        "analogy": "A referee combines independent judges' scores.",
        "animation": "none",
        "good_at": ["combining models"],
        "bad_at": ["small data"],
        "vs_siblings": [],
        "read_more": ["Base predictions become meta-features."],
        "goal": "Learn how to combine model predictions.",
        "steps": ["Generate out-of-fold predictions.", "Fit a final estimator."],
        "math": {
            "notation": [{"symbol": "z_i", "meaning": "Base predictions for row i."}],
            "equations": [{"expression": "yhat_i = g(z_i)", "meaning": "The final estimator maps meta-features to a prediction."}],
            "prediction": "The final estimator combines fitted base-model outputs.",
        },
    }
    assert not list(item_validator.iter_errors(rec))

    rec["slots"]["intuition"]["math"]["equations"][0].pop("meaning")
    assert list(item_validator.iter_errors(rec))
