import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
FIX = ROOT / "tests/fixtures"
INV = FIX / "inventory-fixture.yaml"
spec = importlib.util.spec_from_file_location("extract", ROOT / "tools/extract.py")
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)


def run(out, *extra, ov=None):
    ovdir = ov or (out / "overrides")
    return subprocess.run(
        [sys.executable, str(ROOT / "tools/extract.py"), "--inventory", str(INV),
         "--out", str(out), "--overrides-dir", str(ovdir), *extra],
        capture_output=True, text=True)


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    d = tmp_path_factory.mktemp("ext")
    empty = d / "noov"
    empty.mkdir()
    r = run(d, ov=empty)
    assert r.returncode == 0, r.stderr
    return d


def rec(out, lib, id_):
    return json.loads((out / lib / f"{id_}.json").read_text())


def pmap(r):
    return {p["name"]: p for p in r["parameters"]}


def test_contract_keys(out):
    keys = {"id", "import_path", "library", "library_version", "kind", "doc_url",
            "summary", "signature", "parameters", "attributes", "methods", "returns",
            "extractor_version", "overrides_applied", "warnings"}
    for f in out.glob("*/*.json"):
        r = json.loads(f.read_text())
        assert set(r) == keys
        assert r["summary"]
        for p in r["parameters"]:
            assert set(p) == {"name", "param_kind", "required", "default", "effective_default", "type_doc",
                              "description", "allowed"}
            if p["required"]:
                assert p["default"] is None


def test_sklearn_class(out):
    r = rec(out, "scikit-learn", "sklearn.ensemble.HistGradientBoostingRegressor")
    assert r["library_version"] == "1.9.1"
    lr = pmap(r)["learning_rate"]
    assert lr["default"] == "0.1"
    assert lr["allowed"]["source"] == "constraints"
    assert lr["allowed"]["intervals"][0]["left"] == 0
    assert lr["allowed"]["intervals"][0]["right"] is None
    assert lr["effective_default"] is None
    names = {m["name"] for m in r["methods"]}
    assert {"fit", "predict", "staged_predict"} <= names
    assert r["attributes"]


def test_xgboost_class(out):
    r = rec(out, "xgboost", "xgboost.XGBRegressor")
    p = pmap(r)
    for n in ("n_estimators", "max_depth", "learning_rate", "reg_lambda"):
        assert n in p
    assert p["learning_rate"]["description"]
    assert p["max_depth"]["param_kind"] == "keyword_only"
    assert p["max_depth"]["default"] == "None"
    assert not any(q["param_kind"] == "documented_only" and q["name"] in
                   ("n_estimators", "max_depth", "learning_rate", "reg_lambda")
                   for q in r["parameters"])


def test_lightgbm_class(tmp_path):
    inv = tmp_path / "i.yaml"
    inv.write_text("items:\n- {id: lightgbm.LGBMRegressor, library: lightgbm, "
                   "import_path: lightgbm.LGBMRegressor, kind: class}\n")
    assert subprocess.run([sys.executable, str(ROOT / "tools/extract.py"), "--inventory",
                           str(inv), "--out", str(tmp_path / "o")]).returncode == 0
    r = rec(tmp_path / "o", "lightgbm", "lightgbm.LGBMRegressor")
    p = pmap(r)
    assert p["num_leaves"]["default"] == "31"


def test_statsmodels_class(out):
    r = rec(out, "statsmodels", "statsmodels.api.OLS")
    p = pmap(r)
    assert "endog" in p and p["endog"]["required"]
    assert "fit" in {m["name"] for m in r["methods"]}


def test_scipy_function(out):
    r = rec(out, "scipy", "scipy.stats.linregress")
    assert r["kind"] == "function"
    assert r["returns"] and r["methods"] == []


def test_documented_only_parsing():
    class Fake:
        """Summary.

        Parameters
        ----------
        a : int, default=3
            first.
        extra : float, default=0.5
            Only documented.
        """
        def __init__(self, a=3):
            pass
    w = []
    nd = extract.parse_doc(extract.inspect.getdoc(Fake), w, "d")
    _, params = extract.build_parameters(Fake, "class", nd, w)
    ex = {p["name"]: p for p in params}["extra"]
    assert ex["param_kind"] == "documented_only" and ex["default"] == "0.5"
    assert any("documented only" in x for x in w)


def test_docstring_options():
    assert extract.docstring_options("{'a', 'b'}, default='a'") == ["a", "b"]
    assert extract.docstring_options("{float, int}") == []


def test_override_applied_and_invalid_rejected(tmp_path):
    r = run(tmp_path, "--id", "sklearn.linear_model.Ridge", ov=FIX / "overrides")
    assert r.returncode == 0, r.stderr
    d = rec(tmp_path, "scikit-learn", "sklearn.linear_model.Ridge")
    assert pmap(d)["alpha"]["default"] == "2.5"
    assert d["summary"] == "Patched summary"
    assert pmap(d)["alpha"]["effective_default"] == "2.5"
    assert [o["path"] for o in d["overrides_applied"]] == [
        "parameters[name=alpha].default", "summary",
        "parameters[name=alpha].effective_default"]
    assert d["overrides_applied"][0]["source_url"].startswith("https://")

    r = run(tmp_path, "--id", "scipy.stats.linregress", "--id",
            "sklearn.linear_model.Ridge", ov=FIX / "overrides")
    assert r.returncode != 0
    assert "invalid override path" in r.stderr
    assert not (tmp_path / "scipy/scipy.stats.linregress.json").exists()
    assert (tmp_path / "scikit-learn/sklearn.linear_model.Ridge.json").exists()


def test_import_failure_nonzero_but_others_written(tmp_path):
    inv = tmp_path / "inv.yaml"
    inv.write_text("""items:
- {id: nope.Missing, library: x, import_path: nope.Missing, kind: class}
- {id: sklearn.linear_model.Ridge, library: scikit-learn, import_path: sklearn.linear_model.Ridge, kind: class}
""")
    r = subprocess.run([sys.executable, str(ROOT / "tools/extract.py"), "--inventory",
                        str(inv), "--out", str(tmp_path / "o")], capture_output=True, text=True)
    assert r.returncode != 0 and "failures: 1" in r.stdout
    assert (tmp_path / "o/scikit-learn/sklearn.linear_model.Ridge.json").exists()


def test_deterministic(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    for d in (a, b):
        assert run(d, ov=tmp_path).returncode == 0
    fa = sorted(p.relative_to(a) for p in a.glob("*/*.json"))
    assert fa and fa == sorted(p.relative_to(b) for p in b.glob("*/*.json"))
    for f in fa:
        ta = (a / f).read_text()
        assert ta == (b / f).read_text() and ta.endswith("}\n")
        assert ta == json.dumps(json.loads(ta), indent=2, sort_keys=True,
                                ensure_ascii=False) + "\n"
