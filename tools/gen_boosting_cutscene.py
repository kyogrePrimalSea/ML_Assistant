"""Generate content/cutscenes/boosting-fit.json.

Illustrative data only (spec section 9): a synthetic Ames-like sample (living area vs sale price)
and the staged predictions of scikit-learn's GradientBoostingRegressor after each boosting round.
Seeded, so the output is reproducible. Run from the project root:
    .venv/bin/python tools/gen_boosting_cutscene.py
"""
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

ROUNDS = 5
N_POINTS = 60
GRID = 48  # x positions at which each round's step function is sampled

rng = np.random.default_rng(7)
area = np.clip(rng.normal(1500, 450, N_POINTS), 600, 3200)  # square feet
# Price rises with size, flattens a little, and has a kink: shape that trees pick up in steps.
price = 45_000 + 95 * area + 0.012 * (area - 1500).clip(0) ** 2 * 10 + rng.normal(0, 28_000, N_POINTS)
price = np.clip(price, 60_000, None)

model = GradientBoostingRegressor(
    n_estimators=ROUNDS, max_depth=2, learning_rate=0.6, subsample=1.0, random_state=0
).fit(area.reshape(-1, 1), price)

xs = np.linspace(area.min(), area.max(), GRID)
base = float(np.mean(price))
stages = [np.full(GRID, base)] + [p for p in model.staged_predict(xs.reshape(-1, 1))]

x_lo, x_hi = float(area.min()), float(area.max())
y_lo, y_hi = float(min(price.min(), min(s.min() for s in stages))), float(max(price.max(), max(s.max() for s in stages)))


def nx(v):
    return round((v - x_lo) / (x_hi - x_lo), 4)


def ny(v):
    return round((v - y_lo) / (y_hi - y_lo), 4)


out = {
    "id": "boosting-fit",
    "note": "Illustrative synthetic data (Ames-like living area vs sale price). Coordinates are normalised to 0..1; y grows upward.",
    "x_label": "House size",
    "y_label": "Price",
    "points": [{"x": nx(a), "y": ny(p)} for a, p in zip(area, price)],
    "grid_x": [nx(v) for v in xs],
    "rounds": [[ny(v) for v in s] for s in stages],  # rounds[0] is the starting guess (mean price)
}
dest = Path(__file__).resolve().parent.parent / "content" / "cutscenes" / "boosting-fit.json"
dest.write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(f"wrote {dest} ({len(out['points'])} points, {len(out['rounds'])} stages)")
