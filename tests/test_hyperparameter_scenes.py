"""Shape and reproducibility of the hyperparameter cutscene data (tools/gen_hyperparameter_scenes.py)."""
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "cutscenes"
PAGES = ["n-estimators", "max-depth", "learning-rate", "early-stopping"]


def load(page):
    return json.loads((OUT / f"hyper-{page}.json").read_text())


def run_generator():
    subprocess.run([sys.executable, str(ROOT / "tools" / "gen_hyperparameter_scenes.py")], cwd=ROOT, check=True, capture_output=True)


@pytest.fixture(scope="module", autouse=True)
def generated():
    run_generator()


@pytest.mark.parametrize("page", PAGES)
def test_shape(page):
    d = load(page)
    n = len(d["sweep_values"])
    assert d["id"] == f"hyper-{page}"
    assert d["illustrative_library"] == "scikit-learn GradientBoostingRegressor"
    assert n >= 10
    assert d["sweep_values"] == sorted(set(d["sweep_values"]))
    assert len(d["train_error"]) == len(d["val_error"]) == len(d["fit"]) == n
    assert all(len(f) == len(d["grid_x"]) == 48 for f in d["fit"])
    assert d["best"] in d["sweep_values"]
    assert d["val_error"][d["sweep_values"].index(d["best"])] == min(d["val_error"])
    assert d["control"]["min"] <= d["sweep_values"][0] and d["sweep_values"][-1] <= d["control"]["max"]
    assert all(0 <= p["x"] <= 1 and 0 <= p["y"] <= 1 for p in d["points"])


def test_sweep_values_cover_the_records_hero_sweeps():
    for page, sweep in {
        "n-estimators": [10, 50, 100, 200],
        "max-depth": [2, 4, 8, 16],
        "learning-rate": [0.01, 0.05, 0.1, 0.3],
        "early-stopping": [5, 10, 20, 50],
    }.items():
        assert set(sweep) <= set(load(page)["sweep_values"])


def test_early_stopping_has_stop_rounds():
    d = load("early-stopping")
    assert len(d["stop_round"]) == len(d["sweep_values"])
    assert d["stop_round"] == sorted(d["stop_round"])


def test_rerun_is_byte_identical():
    before = {p: (OUT / f"hyper-{p}.json").read_bytes() for p in PAGES}
    run_generator()
    assert before == {p: (OUT / f"hyper-{p}.json").read_bytes() for p in PAGES}
