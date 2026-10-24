"""Write the Python goal views as a fixture for the JS mirror (app/scripts/goal-view.mjs).

Run from the repo root: .venv/bin/python tools/export_goal_views.py
tests/test_goal_view_fixture.py checks the committed file is current.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.taxonomy import ROOT, goal_view, load_taxonomy

FIXTURE = ROOT / "tests" / "fixtures" / "taxonomy" / "goal-views.json"


def build():
    tax = load_taxonomy()
    return {g["id"]: goal_view(tax, g["id"]) for g in tax["goals"]}


if __name__ == "__main__":
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(json.dumps(build(), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {FIXTURE}")
