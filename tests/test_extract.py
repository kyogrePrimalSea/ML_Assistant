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


# ---------------------------------------------------------------- T013 fixes

def _live(import_path, kind):
    return extract.extract_item({"id": import_path, "import_path": import_path,
                                 "library": import_path.split(".")[0], "kind": kind})


@pytest.mark.parametrize("path", [
    "scipy.optimize.curve_fit",
    "statsmodels.graphics.tsaplots.plot_acf",
    "statsmodels.graphics.tsaplots.plot_pacf"])
def test_t013_function_with_kwargs(path):
    r = _live(path, "function")
    assert r["parameters"]
    assert any(p["param_kind"] == "var_keyword" for p in r["parameters"])


def test_t013_cython_class_signature_fallback():
    r = _live("statsmodels.tsa.seasonal.STL", "class")
    p = pmap(r)
    assert {"endog", "period", "seasonal", "robust"} <= set(p)
    assert p["seasonal"]["default"] == "7"
    assert any(w.startswith("signature:") for w in r["warnings"])


def test_t013_signature_text_and_documented_only_fallbacks(monkeypatch):
    warns = []
    sig = extract._sig_from_text("(a, b=1, *, c='x', **kw)")
    assert [p.name for p in sig.parameters.values()] == ["a", "b", "c", "kw"]
    assert repr(sig.parameters["c"].default) == "'x'"

    class Odd:
        """No signature line.

        Parameters
        ----------
        k : int, default=3
            A knob.
        """
    def boom(*a, **k):
        raise ValueError("no signature")
    monkeypatch.setattr(extract.inspect, "signature", boom)
    sig_str, params = extract.build_parameters(
        Odd, "class", extract.parse_doc(inspect_getdoc(Odd), warns, "d"), warns)
    assert params[0]["param_kind"] == "documented_only" and params[0]["default"] == "3"
    assert any("documented_only" in w for w in warns)


def inspect_getdoc(o):
    import inspect
    return inspect.getdoc(o)


def test_t013_mro_merge_only_documented():
    r = _live("statsmodels.regression.linear_model.OLS", "class")
    assert "weights" not in pmap(r)
    r = _live("statsmodels.tsa.statespace.sarimax.SARIMAX", "class")
    for n in ("k_states", "dates", "freq", "missing"):
        assert n not in pmap(r) or pmap(r)[n]["description"]


def test_t013_xgboost_full_documented_set():
    r = _live("xgboost.XGBRegressor", "class")
    p = pmap(r)
    assert len(p) == 41  # was 44: 3 bogus documented_only duplicates (booster etc.) merged
    for n in ("booster", "num_parallel_tree", "importance_type"):
        assert p[n]["param_kind"] == "keyword_only" and p[n]["description"]
    assert p["learning_rate"]["default"] == "None" and p["n_estimators"]["default"] == "None"


def test_t013_property_attributes():
    r = _live("statsmodels.tsa.seasonal.STL", "class")
    names = [a["name"] for a in r["attributes"]]
    assert len(names) == len(set(names))
    r = _live("statsmodels.regression.linear_model.OLS", "class")
    names = [a["name"] for a in r["attributes"]]
    assert len(names) == len(set(names))
    import inspect
    props = [n for n in dir(r and __import__("statsmodels.regression.linear_model", fromlist=["OLS"]).OLS)
             if isinstance(inspect.getattr_static(
                 __import__("statsmodels.regression.linear_model", fromlist=["OLS"]).OLS, n, None), property)
             and not n.startswith("_")]
    documented = [n for n in props if inspect.getdoc(getattr(
        __import__("statsmodels.regression.linear_model", fromlist=["OLS"]).OLS, n))]
    assert documented and set(documented) <= set(names)


# ---- T014 fixes ----------------------------------------------------------

def test_t014_no_signature_object_gives_empty_parameters():
    r = extract.extract_item({"id": "optuna.TrialPruned", "import_path": "optuna.TrialPruned",
                              "library": "optuna", "kind": "class", "doc_url": ""})
    assert r["parameters"] == [] and r["signature"] == "TrialPruned()"
    assert any("no signature" in w for w in r["warnings"])


def _write_override(tmp_path, patches):
    import yaml
    (tmp_path / "x.yaml").write_text(yaml.safe_dump(
        {"source_url": "https://e/x", "reason": "r", "patches": patches}))


def _base():
    return {"id": "x", "overrides_applied": [], "warnings": [],
            "attributes": [{"name": "a", "type_doc": "", "description": ""},
                           {"name": "b", "type_doc": "", "description": ""}]}


def test_t014_override_append_and_remove(tmp_path):
    rec = _base()
    _write_override(tmp_path, [
        {"path": "attributes", "op": "append",
         "value": [{"name": "c", "type_doc": "", "description": "new"}]},
        {"path": "attributes[name=a]", "op": "remove"}])
    extract.apply_overrides(rec, tmp_path)
    assert [a["name"] for a in rec["attributes"]] == ["b", "c"]
    assert [o.get("op") for o in rec["overrides_applied"]] == ["append", "remove"]


def test_t014_override_append_duplicate_and_remove_absent_error(tmp_path):
    _write_override(tmp_path, [{"path": "attributes", "op": "append",
                                "value": [{"name": "a", "type_doc": "", "description": ""}]}])
    with pytest.raises(extract.ExtractError, match="already exists"):
        extract.apply_overrides(_base(), tmp_path)
    _write_override(tmp_path, [{"path": "attributes[name=zzz]", "op": "remove"}])
    with pytest.raises(extract.ExtractError, match="no such list entry"):
        extract.apply_overrides(_base(), tmp_path)


def test_t014_override_set_is_default_op(tmp_path):
    rec = _base()
    rec["summary"] = "old"
    _write_override(tmp_path, [{"path": "summary", "value": "new"}])
    extract.apply_overrides(rec, tmp_path)
    assert rec["summary"] == "new" and "op" not in rec["overrides_applied"][0]


def test_t014_default_override_drops_memory_address_warning(tmp_path):
    rec = _base()
    rec["parameters"] = [{"name": "link", "default": "<function f at 0x1>"},
                         {"name": "other", "default": "<function g at 0x2>"}]
    rec["warnings"] = ["parameter link: default repr contains a memory address",
                       "parameter other: default repr contains a memory address"]
    _write_override(tmp_path, [{"path": "parameters[name=link].default", "value": "<function f>"}])
    extract.apply_overrides(rec, tmp_path)
    assert rec["warnings"] == ["parameter other: default repr contains a memory address"]


def test_memory_addresses_stripped_from_output(tmp_path):
    import subprocess
    import sys
    inv = tmp_path / "inv.yaml"
    inv.write_text(
        "items:\n"
        "- id: sklearn.feature_selection.SelectKBest\n"
        "  import_path: sklearn.feature_selection.SelectKBest\n"
        "  library: scikit-learn\n"
        "  name: SelectKBest\n"
        "  doc_url: https://example.org\n"
    )
    out = tmp_path / "out"
    subprocess.run([sys.executable, "tools/extract.py", "--inventory", str(inv),
                    "--out", str(out), "--overrides-dir", str(tmp_path / "none")],
                   check=True, capture_output=True)
    text = (out / "scikit-learn" / "sklearn.feature_selection.SelectKBest.json").read_text()
    assert " at 0x" not in text
    assert "<function f_classif>" in text
