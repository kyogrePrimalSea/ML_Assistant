"""Offline tests for tools/verify_docs.py (no network: fixtures and a fake fetcher)."""
import copy
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import verify_docs as vd  # noqa: E402

HTML = ROOT / "tests" / "fixtures" / "html"
EXT = ROOT / "tests" / "fixtures" / "extraction"

SITES = ["sklearn_ridge", "statsmodels_ols", "scipy_linregress", "xgboost_python_api",
         "lightgbm_pythonapi", "imblearn_smote", "optuna_create_study", "shap_tree"]

# Independently checked against the saved pages: (param, default text as printed).
SPOT = {
    "sklearn_ridge": [("alpha", "1.0"), ("solver", "'auto'"), ("tol", "0.0001"), ("max_iter", "None")],
    "statsmodels_ols": [("endog", None), ("missing", "'none'"), ("hasconst", "None")],
    "scipy_linregress": [("x", None), ("alternative", "'two-sided'"), ("nan_policy", "'propagate'")],
    "xgboost_python_api": [("objective", "'reg:squarederror'")],
    "lightgbm_pythonapi": [("num_leaves", "31"), ("max_depth", "-1"), ("learning_rate", "0.1")],
    "imblearn_smote": [("k_neighbors", "5"), ("sampling_strategy", "'auto'")],
    "optuna_create_study": [("load_if_exists", "False"), ("storage", "None")],
    "shap_tree": [("model", None), ("model_output", "'raw'"), ("feature_perturbation", "'auto'")],
}


def load(site):
    html = (HTML / f"{site}.html").read_text(encoding="utf-8")
    rec = json.loads((EXT / f"{site}.json").read_text(encoding="utf-8"))
    return html, rec


@pytest.mark.parametrize("site", SITES)
def test_parses_each_site(site):
    html, rec = load(site)
    parsed = vd.parse_page(html, rec["doc_url"])
    assert parsed is not None
    for name, default in SPOT[site]:
        assert name in parsed["parameters"]
        assert parsed["parameters"][name] == default


@pytest.mark.parametrize("site", SITES)
def test_fixture_extraction_matches(site):
    html, rec = load(site)
    res = vd.verify_record(rec, html)
    assert res["status"] == "match", res


def test_anchored_page_parses_only_that_section():
    html, rec = load("xgboost_python_api")
    parsed = vd.parse_page(html, rec["doc_url"])
    # XGBRegressor's section, not the whole 25-class page
    assert "objective" in parsed["parameters"]
    assert "label_lower_bound" not in parsed["parameters"]
    assert "coef_" in parsed["attributes"]
    other = vd.parse_page(html, "u#xgboost.DMatrix")
    assert other is not None and other["parameters"] != parsed["parameters"]


def test_attributes_parsed():
    html, rec = load("sklearn_ridge")
    assert {"coef_", "intercept_", "n_iter_"} <= set(vd.parse_page(html, rec["doc_url"])["attributes"])
    html, rec = load("lightgbm_pythonapi")
    assert "booster_" in vd.parse_page(html, rec["doc_url"])["attributes"]


def test_wrong_default_and_missing_param_detected():
    html, rec = load("sklearn_ridge")
    bad = copy.deepcopy(rec)
    for p in bad["parameters"]:
        if p["name"] == "alpha":
            p["default"] = "2.0"
    bad["parameters"] = [p for p in bad["parameters"] if p["name"] != "tol"]
    bad["parameters"].append({"name": "bogus", "required": False, "default": "1"})
    bad["attributes"] = [a for a in bad["attributes"] if a["name"] != "coef_"]
    res = vd.verify_record(bad, html)
    assert res["status"] == "mismatch"
    assert res["missing_in_extraction"] == ["tol"]
    assert res["missing_in_docs"] == ["bogus"]
    assert res["default_mismatches"] == [{"name": "alpha", "docs": "1.0", "extraction": "2.0"}]
    assert res["attribute_diff"]["missing_in_extraction"] == ["coef_"]


def test_default_normalisation():
    assert vd.normalise_default("'auto'") == vd.normalise_default('"auto"') == "auto"
    assert vd.normalise_default("1.0") == vd.normalise_default(" 1.0 ")
    assert vd.normalise_default("None") != vd.normalise_default(None)


def test_unparsed_and_fetch_error():
    _, rec = load("sklearn_ridge")
    assert vd.verify_record(rec, "<html><body>nothing here</body></html>")["status"] == "unparsed"
    assert vd.verify_record(rec, None, "HTTP 404")["status"] == "fetch_error"
    anchored = dict(rec, doc_url=rec["doc_url"] + "#no.such.object")
    html, _ = load("sklearn_ridge")
    assert vd.verify_record(anchored, html)["status"] == "unparsed"


class FakeFetcher:
    def __init__(self):
        self.calls = []

    def get(self, url):
        self.calls.append(url)
        site = next(s for s in SITES if json.loads((EXT / f"{s}.json").read_text())["doc_url"] == url)
        return (HTML / f"{site}.html").read_text(encoding="utf-8"), None


def test_run_writes_verification_files_and_filters(tmp_path):
    ex = tmp_path / "extraction"
    for s in SITES:
        rec = json.loads((EXT / f"{s}.json").read_text())
        d = ex / rec["library"]
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{rec['id']}.json").write_text(json.dumps(rec))
    out = ex / "verification"
    fetcher = FakeFetcher()
    results = vd.run(extraction_dir=ex, out_dir=out, fetcher=fetcher)
    assert len(results) == 8 and len(fetcher.calls) == 8
    data = json.loads((out / "scikit-learn.json").read_text())
    assert data[0]["id"] == "sklearn.linear_model.Ridge" and data[0]["status"] == "match"
    assert "scikit-learn" in vd.summary_table(results)
    f2 = FakeFetcher()
    r2 = vd.run(extraction_dir=ex, out_dir=out, library="shap", fetcher=f2)
    assert list(r2) == ["shap"] and len(f2.calls) == 1
    r3 = vd.run(extraction_dir=ex, out_dir=out, item_id="optuna.create_study", fetcher=FakeFetcher())
    assert list(r3) == ["optuna"]


def test_fetcher_uses_cache_without_network(tmp_path, monkeypatch):
    f = vd.Fetcher(tmp_path)
    url = "https://example.invalid/page.html"
    f._path(url).write_text("<html>cached</html>")
    monkeypatch.setattr(vd.urllib.request, "urlopen",
                        lambda *a, **k: (_ for _ in ()).throw(AssertionError("network used")))
    assert f.get(url + "#frag") == ("<html>cached</html>", None)


def test_parameters_section_counts_as_documented():
    """XGBoost's signature is only objective + **kwargs; the Parameters section documents the rest."""
    html, rec = load("xgboost_python_api")
    parsed = vd.parse_page(html, rec["doc_url"])
    for name in ("max_depth", "learning_rate", "n_estimators"):
        assert name in parsed["parameters"]
        assert name in parsed["unknown_default"]  # no default phrase: not compared
    names = [p["name"] for p in rec["parameters"]]
    assert "max_depth" in names and "kwargs" in names
    assert vd.verify_record(rec, html)["status"] == "match"
    # an extraction missing a section-documented parameter is flagged
    bad = copy.deepcopy(rec)
    bad["parameters"] = [p for p in bad["parameters"] if p["name"] != "max_depth"]
    assert vd.verify_record(bad, html)["missing_in_extraction"] == ["max_depth"]
    # any default is accepted when the docs default is unknown
    for p in rec["parameters"]:
        if p["name"] == "max_depth":
            p["default"] = "6"
    assert vd.verify_record(rec, html)["status"] == "match"


def test_default_from_text_phrases():
    assert vd.default_from_text("alpha : float, default=1.0") == "1.0"
    assert vd.default_from_text("(default: 'auto')") == "'auto'"
    assert vd.default_from_text("the value, default 5.") == "5"
    assert vd.default_from_text("uses the default value of the library") is None


def test_effective_default_counts_as_match():
    html, rec = load("sklearn_ridge")
    rec = copy.deepcopy(rec)
    for p in rec["parameters"]:
        if p["name"] == "alpha":
            p["default"] = "None"
            p["effective_default"] = "1.0"
    assert vd.verify_record(rec, html)["status"] == "match"
    for p in rec["parameters"]:
        if p["name"] == "alpha":
            p["effective_default"] = "2.0"
    assert vd.verify_record(rec, html)["default_mismatches"][0]["name"] == "alpha"


def test_var_kwargs_not_flagged():
    html, rec = load("xgboost_python_api")
    assert vd.verify_record(rec, html)["missing_in_extraction"] == []
    assert vd.verify_record(rec, html)["missing_in_docs"] == []
