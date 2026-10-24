"""The committed goal-view fixture (read by the JS mirror's test) matches tools/taxonomy.py."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.export_goal_views import FIXTURE, build


def test_fixture_is_current():
    assert json.loads(FIXTURE.read_text(encoding="utf-8")) == build(), \
        "run: .venv/bin/python tools/export_goal_views.py"
