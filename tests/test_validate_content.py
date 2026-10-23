"""T011: content validator. One failing fixture per check, against a copy of the valid tree."""
import json
import shutil
from pathlib import Path

import pytest
import yaml

from tools.validate_content import main, validate

FIX = Path(__file__).resolve().parent / "fixtures" / "content" / "valid"
XGB = "items/model/xgboost.yaml"
MAXD = "items/tune/max-depth.yaml"
QS = "questions/model.yaml"


@pytest.fixture
def tree(tmp_path):
    dst = tmp_path / "content"
    shutil.copytree(FIX, dst)
    return dst


def edit(tree, rel, fn):
    p = tree / rel
    if p.suffix == ".json":
        d = json.loads(p.read_text())
        fn(d)
        p.write_text(json.dumps(d))
    else:
        d = yaml.safe_load(p.read_text())
        fn(d)
        p.write_text(yaml.safe_dump(d, sort_keys=False))


def errs(tree):
    return [f"{f}: {p}: {m}" for f, p, m in validate(tree)[0]]


def has(tree, *needles):
    out = errs(tree)
    assert any(all(n in e for n in needles) for e in out), out


def test_valid_tree(tree):
    errors, stats = validate(tree)
    assert errors == []
    assert stats == {"records": 2, "reviewed": 0, "unreviewed": 2, "questions": 2}


def test_main_exit_codes_and_format(tree, capsys):
    assert main(["--content", str(tree)]) == 0
    assert "unreviewed 2" in capsys.readouterr().out
    edit(tree, XGB, lambda d: d.update(stage="nope"))
    assert main(["--content", str(tree)]) == 1
    out = capsys.readouterr().out
    assert "items/model/xgboost.yaml: stage: " in out


def test_reviewed_count(tree):
    edit(tree, XGB, lambda d: d.update(reviewed=True))
    assert validate(tree)[1]["reviewed"] == 1


def test_schema_error(tree):
    edit(tree, XGB, lambda d: d["slots"].pop("next"))
    has(tree, XGB, "next")


def test_question_schema_error(tree):
    edit(tree, QS, lambda d: d["questions"][0].pop("text"))
    has(tree, QS, "text")


def test_filename_and_folder_mismatch(tree):
    shutil.move(tree / XGB, tree / "items/model/other.yaml")
    has(tree, "other.yaml", "id", "file name")
    shutil.move(tree / "items/model/other.yaml", tree / "items/tune/xgboost.yaml")
    has(tree, "items/tune/xgboost.yaml", "stage", "folder")


def test_duplicate_id(tree):
    shutil.copy(tree / XGB, tree / "items/model/xgboost2.yaml")
    has(tree, "duplicate id")


def test_target_not_in_inventory(tree):
    edit(tree, XGB, lambda d: d["targets"].__setitem__(0, "xgboost.Nope"))
    has(tree, "targets.0", "not in inventory")


def test_target_without_extraction_record(tree):
    (tree / "extraction/xgboost/xgboost.XGBClassifier.json").unlink()
    has(tree, "targets.1", "no extraction record")


def test_target_on_other_page(tree):
    edit(tree, XGB, lambda d: d["targets"].append("lightgbm.LGBMRegressor"))
    has(tree, "belongs to inventory page 'lightgbm'")


@pytest.mark.parametrize("field,value", [("stage", "tune"), ("family", "Other"), ("archetype", "metric")])
def test_inventory_agreement(tree, field, value):
    def f(d):
        d[field] = value
        if field == "archetype":  # keep the record schema-valid (hero kind equals archetype)
            d["slots"]["solves"]["hero"] = {"kind": "metric", "dataset": "ames", "highlight": ["TP"]}
            d["slots"]["quick_facts"] = {"none": True}
            d["slots"]["intuition"] = {"none": True}
    edit(tree, XGB, f)
    has(tree, XGB, field, "disagrees with inventory")


def test_tracks_disagree(tree):
    edit(tree, XGB, lambda d: d.update(tracks=["standard", "time-series"]))
    has(tree, "tracks", "disagrees")


def test_non_inventory_page_must_be_hyperparameter_or_output(tree):
    edit(tree, XGB, lambda d: d.update(id="not-a-page"))
    has(tree, "not an inventory page")


def test_hyperparameter_skips_inventory_agreement(tree):
    assert errs(tree) == []  # max-depth is not an inventory page and passes


@pytest.mark.parametrize("field", ["pairs_with", "clashes"])
def test_page_refs_resolve(tree, field):
    edit(tree, XGB, lambda d: d.update({field: ["ghost-page"]}))
    has(tree, f"{field}.0", "ghost-page")


def test_applies_to_must_exist(tree):
    def f(d):
        d["applies_to"][0] = "ghost-page"
        d["slots"]["quick_facts"]["values"][0]["page"] = "ghost-page"
    edit(tree, MAXD, f)
    has(tree, "applies_to.0", "ghost-page")


def test_prep_page_resolves_to_inventory_or_record(tree):
    edit(tree, XGB, lambda d: d["slots"]["prep"][-1]["step"].update(page="ghost-page"))
    has(tree, "prep.4.step.page", "ghost-page")
    edit(tree, XGB, lambda d: d["slots"]["prep"][-1]["step"].update(page="max-depth"))  # content record only
    assert not any("prep.4" in e for e in errs(tree))


def test_prep_family_must_exist_in_stage(tree):
    edit(tree, XGB, lambda d: d["slots"]["prep"][0]["step"].update(stage="clean"))
    has(tree, "prep.0.step", "Scaling", "clean")


def test_key_setting_page_resolves(tree):
    edit(tree, XGB, lambda d: d["slots"]["key_settings"]["tier1"][2].update(page="ghost-page"))
    has(tree, "key_settings.tier1.2.page", "ghost-page")


def test_vs_siblings_resolves(tree):
    edit(tree, XGB, lambda d: d["slots"]["intuition"]["vs_siblings"][0].update(page="ghost-page"))
    has(tree, "vs_siblings.0.page")


def test_next_question_resolves(tree):
    edit(tree, XGB, lambda d: d["slots"]["next"].append("ghost-q"))
    has(tree, "slots.next.2", "ghost-q")


def test_snippet_stamp_mismatch_with_library_versions(tree):
    def f(d):
        t = d["slots"]["code"][0]
        t["snippet"] = t["snippet"].replace("xgboost 3.4.1", "xgboost 3.4.0")
    edit(tree, XGB, f)
    has(tree, "code.0.snippet", "should be '# xgboost 3.4.1'")


def test_pinned_version_differs_from_extraction(tree):
    def f(d):
        d["library_versions"]["xgboost"] = "9.9.9"
        d["slots"]["code"][0]["snippet"] = d["slots"]["code"][0]["snippet"].replace("3.4.1", "9.9.9")
    edit(tree, XGB, f)
    has(tree, "differs from extraction record")
    has(tree, "library_versions.xgboost")


def test_library_missing_from_library_versions(tree):
    edit(tree, XGB, lambda d: d.update(library_versions={"lightgbm": "4.7.0"}))
    has(tree, "code.0.library", "missing from library_versions")


def test_code_target_not_in_targets(tree):
    edit(tree, XGB, lambda d: d["slots"]["code"][0].update(target="lightgbm.LGBMRegressor"))
    has(tree, "code.0.target", "not in targets")


def test_key_setting_not_a_parameter(tree):
    edit(tree, XGB, lambda d: d["slots"]["key_settings"]["tier2"][0].update(name="no_such_param"))
    has(tree, "key_settings.tier2.0.name", "no_such_param")


def test_key_setting_exists_in_any_target(tree):
    # only one target's record has the parameter: still fine
    edit(tree, "extraction/xgboost/xgboost.XGBClassifier.json", lambda d: d["parameters"].clear())
    assert errs(tree) == []


def test_hyperparameter_quick_facts_equal_applies_to(tree):
    edit(tree, MAXD, lambda d: d["slots"]["quick_facts"]["values"].pop())
    has(tree, "quick_facts.values", "differ from applies_to")


def test_question_answer_page_resolves(tree):
    edit(tree, QS, lambda d: d["questions"][0]["answers"][0].update(page="ghost-page"))
    has(tree, QS, "answers.0.page", "ghost-page")


def test_question_answer_setting_must_be_key_setting(tree):
    edit(tree, QS, lambda d: d["questions"][0]["answers"].append({"page": "xgboost", "setting": "nope"}))
    has(tree, "answers.3.setting", "nope")
    edit(tree, QS, lambda d: d["questions"][0]["answers"][-1].update(setting="subsample"))
    assert errs(tree) == []


def test_question_next_resolves(tree):
    edit(tree, QS, lambda d: d["questions"][0]["next"].append("ghost-q"))
    has(tree, QS, "next.1", "ghost-q")


def test_question_file_stage_mismatch(tree):
    edit(tree, QS, lambda d: d["questions"][0].update(stage="clean"))
    has(tree, QS, "questions.0.stage")


def test_question_duplicate_id(tree):
    edit(tree, QS, lambda d: d["questions"][1].update(id="model-overfitting"))
    has(tree, "duplicate question id")


def test_stem_cap_per_stage(tree):
    def f(d):
        for i in range(7):  # 7 + 1 existing my_model_is = 8
            d["questions"].append({"id": f"extra-{i}", "stem": "my_model_is", "text": f"Extra {i}",
                                   "stage": "model", "tracks": ["standard"],
                                   "answers": [{"page": "xgboost"}], "next": []})
    edit(tree, QS, f)
    has(tree, "8 questions", "my_model_is", "cap 7")


def test_stem_cap_exactly_seven_ok(tree):
    def f(d):
        for i in range(6):
            d["questions"].append({"id": f"extra-{i}", "stem": "my_model_is", "text": f"Extra {i}",
                                   "stage": "model", "tracks": ["standard"],
                                   "answers": [{"page": "xgboost"}], "next": []})
    edit(tree, QS, f)
    assert errs(tree) == []
