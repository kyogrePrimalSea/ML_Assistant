"""T042: the record scaffolder and the validator's TODO check."""
import shutil
from pathlib import Path

import pytest
import yaml

from tools.scaffold_record import main, scaffold
from tools.validate_content import validate

REAL = Path(__file__).resolve().parent.parent
# one page per archetype that still lacks a record in the real tree
PAGES = {"transformer": "simpleimputer", "resampler": "randomoversampler", "selector": "variancethreshold",
         "splitter": "kfold", "tuning": "gridsearchcv", "metric": "accuracy-score",
         "diagnostic": "vif", "composer": "columntransformer", "model": "ridge"}


@pytest.fixture
def root(tmp_path):
    (tmp_path / "content").mkdir()
    shutil.copy(REAL / "requirements.txt", tmp_path)
    for name in ("taxonomy.yaml",):
        shutil.copy(REAL / "content" / name, tmp_path / "content" / name)
    shutil.copytree(REAL / "content" / "inventory", tmp_path / "content" / "inventory")
    (tmp_path / "content" / "extraction").symlink_to(REAL / "content" / "extraction")
    (tmp_path / "content" / "items").mkdir()
    return tmp_path


def test_one_page_per_archetype(root):
    ids = list(PAGES.values())
    assert sorted(scaffold(ids, root=root)) == sorted(ids)
    for arch, pid in PAGES.items():
        rec_files = list((root / "content" / "items").glob(f"*/{pid}.yaml"))
        assert len(rec_files) == 1
        rec = yaml.safe_load(rec_files[0].read_text())
        assert rec["archetype"] == arch and rec["reviewed"] is False
        assert rec["id"] == pid and rec["slots"]["header"] == {}
        assert rec["slots"]["solves"]["hero"]["kind"] == arch
        assert rec["slots"]["code"][0]["snippet"].startswith("# ")
        assert rec["slots"]["what_comes_out"]["items"]
        assert rec["slots"]["key_settings"]["tier1"] or arch in ("splitter", "metric", "diagnostic")
        assert rec_files[0].with_suffix(".facts.md").exists()


def test_validator_flags_todos_only(root):
    scaffold(list(PAGES.values()), root=root)
    errors, _ = validate(root / "content")
    item_errors = [e for e in errors if str(e[0]).startswith("items/")]
    assert item_errors and all("TODO" in e[2] for e in item_errors)
    assert {Path(str(e[0])).stem for e in item_errors} == set(PAGES.values())


def test_never_overwrites_and_rejects_unknown(root):
    scaffold(["simpleimputer"], root=root)
    p = next((root / "content" / "items").glob("*/simpleimputer.yaml"))
    p.write_text("edited")
    assert scaffold(["simpleimputer"], root=root) == []
    assert p.read_text() == "edited"
    with pytest.raises(SystemExit):
        scaffold(["no-such-page"], root=root)


def test_stage_flag_skips_filled_pages(root):
    done = scaffold([], root=root, stage="clean")
    assert len(done) == 4
    assert scaffold([], root=root, stage="clean") == []
