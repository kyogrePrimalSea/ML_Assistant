"""T028: shape of the generated toy outputs (content/cutscenes/outputs/<page>.json)."""
import json
import math
from pathlib import Path

import pytest

OUT = Path(__file__).resolve().parent.parent / "content" / "cutscenes" / "outputs"
PAGES = ["xgboost", "lightgbm", "hist-gradient-boosting", "gradient-boosting"]


@pytest.mark.parametrize("page", PAGES)
def test_output_shape(page):
    d = json.loads((OUT / f"{page}.json").read_text())
    assert d["page"] == page and d["library"] and d["library_version"]
    c = d["classification"]
    assert c["dataset"] == "breast-cancer"
    assert c["classes"] == [0, 1] and c["class_names"] == ["malignant", "benign"]
    assert len(c["rows"]) == 8
    for r in c["rows"]:
        assert len(r["proba"]) == len(c["classes"])
        assert abs(sum(r["proba"]) - 1) <= 0.002
        assert r["y_true"] in c["classes"]
    assert sum(0.2 <= r["proba"][1] <= 0.8 for r in c["rows"]) >= 2  # a threshold slider flips labels
    g = d["regression"]
    assert g["dataset"] == "ames" and g["target_transform"] == "log1p" and len(g["rows"]) == 8
    for r in g["rows"]:
        assert abs(r["y_pred"] - math.expm1(r["y_pred_log"])) <= 0.001 * r["y_pred"]


def test_class_order_matches_predict_proba():
    """Column order of the stored probabilities is the estimator's classes_ order."""
    from sklearn.datasets import load_breast_cancer

    from tools.gen_what_comes_out import PAGES as P

    d = load_breast_cancer()
    model = P["gradient-boosting"][1]().fit(d.data[:200], d.target[:200])
    stored = json.loads((OUT / "gradient-boosting.json").read_text())["classification"]
    assert stored["classes"] == [int(c) for c in model.classes_]
    assert stored["class_names"] == [str(d.target_names[c]) for c in model.classes_]
