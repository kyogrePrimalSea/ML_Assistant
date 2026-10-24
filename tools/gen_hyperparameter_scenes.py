"""Generate content/cutscenes/hyper-<page>.json for the four hyperparameter pages.

Illustrative data only (spec section 9): a synthetic Ames-like sample (living area vs sale price, as in
gen_boosting_cutscene.py but with a bend and a wiggle added and more rows, so that depth and rounds visibly matter)
plus held-out validation rows from the same recipe. One library, scikit-learn's GradientBoostingRegressor, carries the
shape story for all four pages. Seeded, so reruns are byte-identical. Run from the project root:
    .venv/bin/python tools/gen_hyperparameter_scenes.py
"""
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

N_TRAIN = 200
N_VAL = 300
GRID = 48  # x positions at which each fit is sampled
OUT = Path(__file__).resolve().parent.parent / "content" / "cutscenes"

def sample(seed, n):
    """Living area (sq ft) and price: rises with size, with a bend and a wiggle that deeper trees can follow."""
    r = np.random.default_rng(seed)
    area = np.clip(r.normal(1500, 450, n), 600, 3200)
    price = 45_000 + 95 * area + 0.12 * (area - 1500).clip(0) ** 2 + 35_000 * np.sin(area / 260) + r.normal(0, 18_000, n)
    return area, np.clip(price, 60_000, None)


area_all, price_all = sample(7, N_TRAIN)
area_val, price_val = sample(11, N_VAL)

Xtr, ytr = area_all.reshape(-1, 1), price_all
Xva, yva = area_val.reshape(-1, 1), price_val
xs = np.linspace(min(area_all.min(), area_val.min()), max(area_all.max(), area_val.max()), GRID)
Xg = xs.reshape(-1, 1)
x_lo, x_hi = float(xs.min()), float(xs.max())


def rmse(y, p):
    return float(np.sqrt(np.mean((y - p) ** 2)))


def model(**kw):
    base = dict(n_estimators=100, max_depth=3, learning_rate=0.1, subsample=1.0, random_state=0)
    base.update(kw)
    return GradientBoostingRegressor(**base).fit(Xtr, ytr)


def thin(lo, hi, n, must):
    vals = set(np.unique(np.round(np.linspace(lo, hi, n)).astype(int)).tolist()) | set(must)
    return sorted(v for v in vals if lo <= v <= hi)


def scene(page, setting, control, values, rows, extra=None):
    """rows: one (train_error, val_error, fit_values) per value."""
    all_y = [yva.min(), yva.max(), ytr.min(), ytr.max()] + [r[2].min() for r in rows] + [r[2].max() for r in rows]
    y_lo, y_hi = float(min(all_y)), float(max(all_y))
    ny = lambda v: round((v - y_lo) / (y_hi - y_lo), 4)
    nx = lambda v: round((v - x_lo) / (x_hi - x_lo), 4)
    val_errs = [round(r[1]) for r in rows]
    out = {
        "id": f"hyper-{page}",
        "note": "Illustrative synthetic data (Ames-like living area vs sale price). Coordinates are normalised to 0..1; y grows upward. Errors are RMSE in dollars.",
        "illustrative_library": "scikit-learn GradientBoostingRegressor",
        "setting": setting,
        "control": control,
        "x_label": "House size",
        "y_label": "Price",
        "points": [{"x": nx(a), "y": ny(p)} for a, p in zip(area_all, price_all)],
        "grid_x": [nx(v) for v in xs],
        "sweep_values": values,
        "train_error": [round(r[0]) for r in rows],
        "val_error": val_errs,
        "fit": [[ny(v) for v in r[2]] for r in rows],
        "best": values[int(np.argmin(val_errs))],
    }
    out.update(extra or {})
    (OUT / f"hyper-{page}.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    print(f"wrote hyper-{page}.json ({len(values)} values, best {out['best']})")


# n_estimators: one 200-tree model, staged predictions.
m = model(n_estimators=200)
tr = list(m.staged_predict(Xtr))
va = list(m.staged_predict(Xva))
gr = list(m.staged_predict(Xg))
vals = thin(1, 200, 40, [10, 50, 100, 200])
scene(
    "n-estimators", "n_estimators", {"min": 1, "max": 200},
    vals, [(rmse(ytr, tr[v - 1]), rmse(yva, va[v - 1]), gr[v - 1]) for v in vals],
)

# max_depth 1..16, 12 trees at learning rate 0.3 (few rounds, so shallow trees visibly underfit).
vals = list(range(1, 17))
rows = []
for d in vals:
    mm = model(max_depth=d, n_estimators=12, learning_rate=0.3)
    rows.append((rmse(ytr, mm.predict(Xtr)), rmse(yva, mm.predict(Xva)), mm.predict(Xg)))
scene("max-depth", "max_depth", {"min": 1, "max": 16}, vals, rows)

# learning_rate 0.01..1 with 50 rounds, depth 3.
vals = sorted({round(float(v), 2) for v in np.linspace(0.01, 1.0, 34)} | {0.05, 0.1, 0.3, 1.0})
rows = []
for lr in vals:
    mm = model(n_estimators=50, learning_rate=lr)
    rows.append((rmse(ytr, mm.predict(Xtr)), rmse(yva, mm.predict(Xva)), mm.predict(Xg)))
scene("learning-rate", "learning_rate", {"min": 0.01, "max": 1}, vals, rows)

# early stopping: one long run (300 rounds, learning rate 0.1, depth 2); for each patience, stop at the first
# round after which the validation error fails to improve for `patience` rounds, and keep the best-so-far model.
ROUNDS = 300
m = model(n_estimators=ROUNDS, learning_rate=0.5, max_depth=3)
tr = list(m.staged_predict(Xtr))
va = list(m.staged_predict(Xva))
gr = list(m.staged_predict(Xg))
staged_val = [rmse(yva, p) for p in va]


def stop_round(patience):
    best_i, best_v = 0, staged_val[0]
    for i, v in enumerate(staged_val):
        if v < best_v - 1e-9:
            best_i, best_v = i, v
        elif i - best_i >= patience:
            return i  # training halts here
    return ROUNDS - 1


vals = list(range(1, 51))
stops = [stop_round(p) for p in vals]
rows = [(rmse(ytr, tr[s]), staged_val[s], gr[s]) for s in stops]
scene(
    "early-stopping", "early_stopping_rounds", {"min": 1, "max": 50}, vals, rows,
    extra={
        "stop_round": [s + 1 for s in stops],
        "staged_rounds": 5,
        "staged_val_error": [round(v) for v in staged_val[::5]],
    },
)
