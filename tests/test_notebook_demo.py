"""T026: the demo journey's notebook is valid nbformat 4, deterministic, and runs."""
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
NODE = shutil.which("node")

pytestmark = pytest.mark.skipif(NODE is None, reason="node not installed")


def export(out: Path) -> bytes:
    subprocess.run([NODE, "scripts/export-demo-notebook.mjs", str(out)], cwd=APP, check=True)
    return out.read_bytes()


@pytest.fixture(scope="module")
def notebook_bytes(tmp_path_factory):
    d = tmp_path_factory.mktemp("nb")
    first = export(d / "a.ipynb")
    second = export(d / "b.ipynb")
    return first, second


def test_same_picks_give_byte_identical_notebook(notebook_bytes):
    assert notebook_bytes[0] == notebook_bytes[1]


def test_valid_nbformat_4_structure(notebook_bytes):
    nb = json.loads(notebook_bytes[0])
    assert nb["nbformat"] == 4 and nb["nbformat_minor"] >= 5
    assert nb["metadata"]["kernelspec"]["language"] == "python"
    ids = [c["id"] for c in nb["cells"]]
    assert len(ids) == len(set(ids))
    for c in nb["cells"]:
        assert c["cell_type"] in ("markdown", "code")
        assert isinstance(c["source"], list) and all(isinstance(s, str) for s in c["source"])
        assert "metadata" in c
        if c["cell_type"] == "code":
            assert c["outputs"] == [] and c["execution_count"] is None
    try:
        import nbformat
    except ImportError:
        return
    nbformat.validate(nbformat.reads(notebook_bytes[0].decode(), as_version=4))


def test_cells_run_in_sequence_with_toy_data(notebook_bytes):
    nb = json.loads(notebook_bytes[0])
    code = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
    # one setup cell plus one per stop: one-hot, split, XGBoost, R-squared
    assert len(code) == 5
    rng = np.random.default_rng(0)
    toy = pd.DataFrame(
        {
            "Street": rng.choice(["Pave", "Grvl"], 200),
            "LotArea": rng.normal(size=200),
            "YearBuilt": rng.normal(size=200),
        }
    )
    toy["price"] = toy["LotArea"] * 3 + (toy["Street"] == "Pave") * 2 + rng.normal(scale=0.1, size=200)
    toy.loc[::17, "LotArea"] = np.nan  # missing values: XGBoost handles them natively

    setup = code[0]
    assert 'pd.read_csv("TODO_path_to_data.csv")' in setup
    setup = (
        setup.replace('pd.read_csv("TODO_path_to_data.csv")', "toy.copy()")
        .replace('"TODO_target_column"', '"price"')
        .replace('["TODO_categorical_column"]', '["Street"]')
    )
    env = {"toy": toy}
    for src in [setup, *code[1:]]:
        assert "TODO_" not in src
        exec(compile(src, "<cell>", "exec"), env)
    assert env["model"].named_steps["model"].__class__.__name__ == "XGBRegressor"
    assert env["r2_score"](env["y_test"], env["y_pred"]) > 0.5
