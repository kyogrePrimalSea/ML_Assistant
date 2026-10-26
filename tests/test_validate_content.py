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


@pytest.mark.parametrize("field,value", [("archetype", "metric")])
def test_inventory_agreement(tree, field, value):
    def f(d):
        d[field] = value
        if field == "archetype":  # keep the record schema-valid (hero kind equals archetype)
            d["slots"]["solves"]["hero"] = {"kind": "metric", "dataset": "ames", "highlight": ["TP"]}
            d["slots"]["quick_facts"] = {"none": True}
            d["slots"]["intuition"] = {"none": True}
    edit(tree, XGB, f)
    has(tree, XGB, field, "is not one of the inventory archetypes")


def test_tracks_must_cover_inventory(tree):
    edit(tree, XGB, lambda d: d.update(tracks=["time-series"]))
    has(tree, "tracks", "misses inventory tracks ['standard']")
    # wider than the inventory is fine: the taxonomy places pages for more goals
    edit(tree, MAXD, lambda d: d.update(tracks=["standard", "time-series"]))
    assert not any("max-depth" in e for e in errs(tree))


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


def test_prep_family_must_be_a_taxonomy_family(tree):
    edit(tree, XGB, lambda d: d["slots"]["prep"][0]["step"].update(family="transform.nope"))
    has(tree, "prep.0.step", "transform.nope", "taxonomy family")
    edit(tree, XGB, lambda d: d["slots"]["prep"][0]["step"].update(family="Scaling"))
    has(tree, "prep.0.step", "not valid under any")  # schema: ids only, the old name is rejected


def test_prep_step_with_stage_is_rejected(tree):
    edit(tree, XGB, lambda d: d["slots"]["prep"][0]["step"].update(stage="transform"))
    has(tree, "prep.0")


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


def test_question_answer_setting_may_be_extraction_parameter(tree):
    # random-forest has no content record; its targets' extraction carries max_depth only.
    edit(tree, QS, lambda d: d["questions"][0]["answers"].append({"page": "random-forest", "setting": "max_depth"}))
    assert errs(tree) == []
    edit(tree, QS, lambda d: d["questions"][0]["answers"][-1].update(setting="nope"))
    has(tree, "answers.3.setting", "nope", "random-forest")


def _we_need(i, **kw):
    q = {"id": f"but-{i}", "stem": "we_need_but", "text": f"We need item {i}, but it is hard",
         "stage": "model", "tracks": ["standard"], "answers": [{"page": "xgboost"}], "next": []}
    q.update(kw)
    return q


def test_we_need_but_text_prefix(tree):
    edit(tree, QS, lambda d: d["questions"].append(_we_need(1)))
    assert errs(tree) == []
    edit(tree, QS, lambda d: d["questions"][-1].update(text="Need item 1, but it is hard"))
    has(tree, QS, "questions.2.text", "We need")


def test_answer_note_word_limit(tree):
    edit(tree, QS, lambda d: d["questions"][0]["answers"][0].update(note="one two three four five six seven eight"))
    assert errs(tree) == []
    edit(tree, QS, lambda d: d["questions"][0]["answers"][0].update(note=" ".join(["w"] * 17)))
    has(tree, "answers.0.note", "16 words")


def test_we_need_but_cap_is_per_track(tree):
    def f(d):
        for i in range(7):
            d["questions"].append(_we_need(i))
        for i in range(7, 11):
            d["questions"].append(_we_need(i, tracks=["time-series"]))
    edit(tree, QS, f)
    assert errs(tree) == []  # 7 standard + 4 time-series
    edit(tree, QS, lambda d: d["questions"].append(_we_need(99)))
    has(tree, "8 questions", "we_need_but", "track 'standard'", "cap 7")


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


# ---- T028: What comes out slot

WOC = {
    "items": [
        {"name": "predict_proba", "kind": "method", "task": "classification",
         "shape": "(n_samples, n_classes)", "note": "One column per class, in classes_ order.",
         "object_type": "numpy.ndarray", "example": "[[0.8, 0.2]]",
         "shape_explanation": "A table with one row per case and one column per class."},
        {"name": "best_iteration", "kind": "attribute", "task": None,
         "shape": "int", "note": "Round that scored best on the validation set."},
    ],
    "next_step": "Keep [:, 1] as y_score for ROC AUC.",
    "guidance": [{"task": "classification", "text": "Use scores for ranking metrics."}],
    "snippet": "# xgboost 3.4.1\nprint(1)\n",
    "snippet_library": "xgboost",
    "output": "1\n",
    "visual": "proba_table",
}
XGB_CLF = "extraction/xgboost/xgboost.XGBClassifier.json"


def with_woc(tree, **over):
    def f(d):
        d["slots"]["what_comes_out"] = {**WOC, **over}
    edit(tree, XGB, f)
    edit(tree, XGB_CLF, lambda d: d.update(methods=[{"name": "predict_proba"}], attributes=[{"name": "best_iteration"}]))


def test_what_comes_out_valid(tree):
    with_woc(tree)
    assert errs(tree) == []


def test_what_comes_out_unknown_name(tree):
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"][0].update(name="predict_probaa"))
    has(tree, XGB, "what_comes_out.items.0.name", "predict_probaa")
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"].__setitem__(
        0, {**WOC["items"][0], "kind": "return", "name": "anything"}))
    assert errs(tree) == []  # `return` entries are not checked against the extraction


def test_what_comes_out_name_via_applies_to(tree):
    def f(d):
        d["slots"]["what_comes_out"] = {"items": [{"name": "predict_proba", "kind": "method", "task": None,
                                                   "shape": "array", "note": "Probabilities."}],
                                        "next_step": None, "visual": None}
    edit(tree, MAXD, f)
    has(tree, MAXD, "what_comes_out.items.0.name")
    edit(tree, XGB_CLF, lambda d: d.update(methods=[{"name": "predict_proba"}]))
    assert errs(tree) == []


@pytest.mark.parametrize("visual,task_types,ok", [
    ("proba_table", ["regression"], False),
    ("regression_preds", ["classification"], False),
    ("both", ["classification"], False),
    ("both", ["classification", "regression"], True),
    ("regression_preds", ["regression", "classification"], True),
])
def test_what_comes_out_visual_vs_task_type(tree, visual, task_types, ok):
    with_woc(tree, visual=visual)
    edit(tree, XGB, lambda d: d["rules"].update(task_types=task_types))
    if ok:
        assert errs(tree) == []
    else:
        has(tree, XGB, "what_comes_out.visual", visual)


def test_what_comes_out_snippet_checks(tree):
    with_woc(tree, snippet="# xgboost 9.9\nprint(1)\n")
    has(tree, XGB, "what_comes_out.snippet", "should be '# xgboost 3.4.1'")
    with_woc(tree, snippet_library="lightgbm", snippet="# lightgbm 4.7.0\nprint(1)\n")
    has(tree, XGB, "snippet_library", "missing from library_versions")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"].pop("snippet_library"))
    has(tree, XGB, "slots.what_comes_out")  # snippet without snippet_library fails the schema


def test_what_comes_out_schema_rejections(tree):
    edit(tree, XGB, lambda d: d["slots"].pop("what_comes_out"))
    has(tree, XGB, "what_comes_out")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"][0].update(note=" ".join(["w"] * 17)))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"][0].update(kind="function"))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"].update(items=[]))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree, output="")
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree, guidance=[])
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"][0].update(example=""))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"]["items"][0].update(shape_explanation=""))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")
    with_woc(tree)
    edit(tree, XGB, lambda d: d["slots"]["what_comes_out"].pop("snippet"))
    has(tree, XGB, "slots.what_comes_out", "not valid under any")


def test_long_lines_warn_without_failing(tree, capsys):
    long = "x = '" + "a" * 80 + "'"
    with_woc(tree, snippet="# xgboost 3.4.1\n" + long + "\n")
    edit(tree, XGB, lambda d: d["slots"]["code"][0].update(snippet="# xgboost 3.4.1\n" + "y" * 80 + "\n\n" + long + "\n"))
    warnings = []
    errors, _ = validate(tree, warnings)
    assert errors == []
    msgs = [f"{f}: {p}: {m}" for f, p, m in warnings]
    assert any("slots.code.0.snippet" in m and "code tab 0" in m and "line 2 " in m for m in msgs), msgs
    assert any("slots.code.0.snippet" in m and "line 4 " in m for m in msgs), msgs
    assert any("what_comes_out.snippet" in m and "line 2 " in m for m in msgs), msgs
    assert all(XGB in m for m in msgs)
    assert main(["--content", str(tree)]) == 0
    out = capsys.readouterr().out
    assert "warnings (3" in out and "errors: 0" in out


# ---- T035: taxonomy rules

TAXF = "taxonomy.yaml"
EXC = "taxonomy-exceptions.yaml"


def warns(tree):
    w = []
    validate(tree, w)
    return [f"{f}: {p}: {m}" for f, p, m in w]


def tax_node(d, node_id):
    from tools.taxonomy import source_nodes
    return next(n for n, _ in source_nodes(d) if n["id"] == node_id)


def write_exceptions(tree, *entries):
    (tree / EXC).write_text(yaml.safe_dump({"exceptions": list(entries)}, sort_keys=False))


def test_taxonomy_file_is_required(tree):
    (tree / TAXF).unlink()
    has(tree, TAXF, "file is missing")


def test_taxonomy_schema_runs_inside_the_validator(tree):
    edit(tree, TAXF, lambda d: d["stages"].reverse())
    has(tree, TAXF)


def test_every_page_in_the_taxonomy_exactly_once(tree):
    def drop(d):
        tax_node(d, "split.holdout")["pages"].clear()
        tax_node(d, "split.holdout")["pages"].append(page_copy(d, "r2-score", "split.holdout"))
    # inventory page missing from the taxonomy, and a taxonomy page with no inventory entry
    def page_copy(d, pid, fam):
        return {"id": "ghost-page", "shown_as": "Ghost", "for": ["predict-number"], "pick_when": "never"}
    edit(tree, TAXF, drop)
    has(tree, TAXF, "train-test-split", "not in the taxonomy")
    has(tree, TAXF, "ghost-page", "not in the inventory or content records")


def test_content_only_record_must_be_in_the_taxonomy(tree):
    edit(tree, TAXF, lambda d: tax_node(d, "tune.settings.complexity")["pages"].clear() or
         tax_node(d, "tune.settings.complexity")["pages"].append(
             {"id": "other-setting", "shown_as": "x", "for": ["predict-number"], "pick_when": "never"}))
    has(tree, "max-depth", "not in the taxonomy")


def test_page_twice_in_taxonomy(tree):
    edit(tree, TAXF, lambda d: tax_node(d, "split.holdout")["pages"].append(
        dict(tax_node(d, "interpret.explainer-fast")["pages"][0])))
    has(tree, "treeexplainer", "2 times")


def test_record_stage_and_family_follow_the_taxonomy(tree):
    edit(tree, XGB, lambda d: d.update(family="model.trees.bagging"))
    has(tree, XGB, "family", "differs from taxonomy family 'model.trees.boosting'")
    edit(tree, XGB, lambda d: d.update(family="model.trees.boosting"))
    edit(tree, MAXD, lambda d: d.update(stage="model"))
    has(tree, "max-depth.yaml", "stage", "differs from taxonomy stage 'tune'")


def test_record_family_must_be_an_id(tree):
    edit(tree, XGB, lambda d: d.update(family="Boosting (XGBoost)"))
    has(tree, XGB, "family", "does not match")


def test_record_tracks_follow_the_taxonomy_for_field(tree):
    edit(tree, MAXD, lambda d: d.update(tracks=["standard"]))
    has(tree, "max-depth.yaml", "tracks", "lacks track 'time-series'", "forecast")
    edit(tree, MAXD, lambda d: d.update(tracks=["standard", "time-series"]))
    assert errs(tree) == []


def test_record_task_types_must_contain_the_goal_task(tree):
    edit(tree, XGB, lambda d: d["rules"].update(task_types=["regression"]))
    has(tree, "[task-types]", "xgboost", "lacks task 'classification'", "predict-category")
    edit(tree, XGB, lambda d: d["rules"].update(task_types=[]))  # empty means task-agnostic
    assert errs(tree) == []


def test_task_type_disagreement_can_be_allow_listed(tree):
    edit(tree, XGB, lambda d: d["rules"].update(task_types=["regression"]))
    write_exceptions(tree, {"rule": "task-types", "node": "xgboost", "goal": "predict-category",
                            "reason": "Map lists the page for classification; record says regression only."})
    assert errs(tree) == []
    assert any("xgboost" in w and "allow-listed: Map lists" in w for w in warns(tree))


@pytest.mark.parametrize("field,value,needle", [
    ("question_prompt", "Where are we in the work", "does not end in '?'"),
    ("question_prompt", "How should we choose which boosting library suits us best?", "limit 48"),
    ("question_label", "Get the best accuracy we can with every column we have", "limit 40"),
    ("question_sentence", "Predict a number", "does not start with 'We need' or 'We have'"),
    ("question_sentence", "We need " + "very " * 25 + "much", "limit 110"),
    ("question_label", "Fit & finish", "'&' or '!'"),
    ("question_label", "Fix it!", "'&' or '!'"),
])
def test_label_rules(tree, field, value, needle):
    node = "model.trees.boosting"
    def f(d):
        tax_node(d, node)[field] = value
    edit(tree, TAXF, f)
    has(tree, TAXF, node, needle)


def test_pick_when_limit(tree):
    edit(tree, TAXF, lambda d: tax_node(d, "split.holdout")["pages"][0].update(pick_when="x" * 61))
    has(tree, TAXF, "train-test-split", "pick_when", "limit 60")
    edit(tree, TAXF, lambda d: tax_node(d, "split.holdout")["pages"][0].update(pick_when="x" * 60))
    assert errs(tree) == []


def test_per_goal_map_texts_are_checked(tree):
    def f(d):
        st = next(s for s in d["stages"] if s["id"] == "model")
        st["question_prompt"]["forecast"] = "How should we forecast the series for next quarter and beyond?"
    edit(tree, TAXF, f)
    has(tree, TAXF, "model", "limit 48")


def test_goal_level_texts_are_checked(tree):
    edit(tree, TAXF, lambda d: d["goals"][0].update(question_label="Predict a number, like a price or a duration"))
    has(tree, TAXF, "predict-number", "limit 40")


def test_label_violation_can_be_allow_listed(tree):
    edit(tree, TAXF, lambda d: tax_node(d, "model.trees.boosting").update(question_label="Get the best accuracy we can, every single time"))
    has(tree, TAXF, "limit 40")
    write_exceptions(tree, {"rule": "question_label", "node": "model.trees.boosting", "reason": "Map wording"})
    assert errs(tree) == []
    assert any("model.trees.boosting" in w and "allow-listed: Map wording" in w for w in warns(tree))


def test_allow_list_matches_exactly_that_rule_and_node(tree):
    edit(tree, TAXF, lambda d: tax_node(d, "model.trees.boosting").update(question_label="Get the best accuracy we can, every single time"))
    write_exceptions(tree, {"rule": "question_prompt", "node": "model.trees.boosting", "reason": "wrong rule"},
                     {"rule": "question_label", "node": "model.trees", "reason": "wrong node"})
    has(tree, TAXF, "limit 40")
    assert sum("matches no violation" in w for w in warns(tree)) == 2


def test_stale_allow_list_entry_warns(tree):
    write_exceptions(tree, {"rule": "max-children", "node": "model", "reason": "none now"})
    assert errs(tree) == []
    assert any("matches no violation" in w and "max-children" in w for w in warns(tree))


def test_malformed_allow_list_entry(tree):
    write_exceptions(tree, {"rule": "max-children", "node": "model"})
    has(tree, EXC, "rule, node and reason")


def many_pages(d, n=8):
    fam_ = tax_node(d, "model.trees.boosting")
    fam_["pages"] = fam_["pages"] + [{"id": f"extra-{i}", "shown_as": "x", "for": ["predict-number"],
                                      "pick_when": "never"} for i in range(n)]


def test_more_than_seven_children_in_a_goal_view(tree):
    edit(tree, TAXF, many_pages)
    has(tree, TAXF, "[max-children]", "model.trees.boosting", "has 11 children in goal 'predict-number'")
    edit(tree, TAXF, lambda d: None)
    # exactly seven is fine
    edit(tree, TAXF, lambda d: tax_node(d, "model.trees.boosting").update(pages=tax_node(d, "model.trees.boosting")["pages"][:3]))
    edit(tree, TAXF, lambda d: many_pages(d, 4))
    assert not any("max-children" in e for e in errs(tree))


def test_max_children_can_be_allow_listed_per_goal(tree):
    edit(tree, TAXF, many_pages)
    write_exceptions(tree, {"rule": "max-children", "node": "model.trees.boosting", "goal": "predict-category",
                            "reason": "wrong goal"})
    has(tree, "[max-children]", "predict-number")
    write_exceptions(tree, {"rule": "max-children", "node": "model.trees.boosting", "goal": "predict-number",
                            "reason": "Map lists nine boosters"})
    assert not any("max-children" in e for e in errs(tree))
    assert any("has 11 children" in w and "allow-listed: Map lists nine boosters" in w for w in warns(tree))


def test_single_child_rule_on_a_view():
    # goal_view elides every single-child level, so the rule is a guard; check it fires on a bad view
    from tools import validate_content as vc
    t = yaml.safe_load((FIX / TAXF).read_text())
    seen = []
    orig = vc.goal_view
    def bad(tax, g):
        v = orig(tax, g)
        v[5]["children"] = [{"id": "lonely", "level": "family", "children": [
            {"id": "only", "level": "page", "children": []}]}]
        return v
    vc.goal_view = bad
    try:
        vc.taxonomy_checks(FIX, t, lambda rule, node, msg, goal=None: seen.append((rule, node)))
    finally:
        vc.goal_view = orig
    assert ("single-child", "lonely") in seen


def test_real_taxonomy_has_no_violations():
    from tools.validate_content import ROOT as REPO
    w = []
    errors, _ = validate(REPO / "content", w)
    assert [e for e in errors if e[0] == TAXF] == []


def test_we_need_but_setting_must_be_an_extraction_parameter(tree):
    # a hyperparameter record has no targets, so its key_settings can name anything
    edit(tree, MAXD, lambda d: d["slots"]["key_settings"]["tier1"].append({"name": "fancy_knob", "page": None}))
    edit(tree, QS, lambda d: d["questions"].append(_we_need(1, answers=[{"page": "max-depth", "setting": "fancy_knob"}])))
    has(tree, QS, "questions.2.answers.0.setting", "fancy_knob", "extraction")
    # the same answer under another stem only needs key_settings or extraction
    edit(tree, QS, lambda d: d["questions"][-1].update(stem="my_model_is"))
    assert errs(tree) == []
    # a real parameter of an inventory page's targets passes under we_need_but
    edit(tree, QS, lambda d: d["questions"][-1].update(
        stem="we_need_but", answers=[{"page": "random-forest", "setting": "max_depth"}]))
    assert errs(tree) == []
    edit(tree, QS, lambda d: d["questions"][-1].update(answers=[{"page": "xgboost", "setting": "subsample"}]))
    assert errs(tree) == []
