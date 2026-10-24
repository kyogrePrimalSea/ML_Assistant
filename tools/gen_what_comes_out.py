"""Generate content/cutscenes/outputs/<page>.json for the "What comes out" slot visual (T028).

Illustrative data only (spec section 9). For each boosting page, fits that page's own library
classes on a toy dataset and keeps eight test rows:
  - classification: scikit-learn breast cancer; probabilities in predict_proba column order.
  - regression: the synthetic Ames-like sample of tools/gen_boosting_cutscene.py (same generation
    code, copied here because that script writes its file on import), target log1p-transformed.
Seeded and single-threaded, so reruns are byte-identical. Run from the project root:
    .venv/bin/python tools/gen_what_comes_out.py
"""
import json
import warnings
from importlib.metadata import version
from pathlib import Path

import numpy as np
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor

warnings.filterwarnings("ignore")
N_ROWS = 8
N_EST = 20  # small: quick, and not so confident that every probability sits near 0 or 1
N_POINTS = 60
SEED = 0

# LGBMRegressor also gets min_child_samples=5: with the default 20 and ~45 training rows it never splits
# and predicts one constant. n_jobs=1 keeps the output reproducible.
# page -> (library, classifier factory, regressor factory)
PAGES = {
    "xgboost": ("xgboost", lambda: XGBClassifier(n_estimators=N_EST, random_state=SEED, n_jobs=1),
                lambda: XGBRegressor(n_estimators=N_EST, random_state=SEED, n_jobs=1)),
    "lightgbm": ("lightgbm", lambda: LGBMClassifier(n_estimators=N_EST, random_state=SEED, n_jobs=1, verbose=-1),
                 lambda: LGBMRegressor(n_estimators=N_EST, min_child_samples=5, random_state=SEED, n_jobs=1, verbose=-1)),
    "hist-gradient-boosting": ("scikit-learn", lambda: HistGradientBoostingClassifier(max_iter=N_EST, random_state=SEED),
                               lambda: HistGradientBoostingRegressor(max_iter=N_EST, random_state=SEED)),
    "gradient-boosting": ("scikit-learn", lambda: GradientBoostingClassifier(n_estimators=N_EST, random_state=SEED),
                          lambda: GradientBoostingRegressor(n_estimators=N_EST, random_state=SEED)),
}


def ames_sample():
    """Same generation code as tools/gen_boosting_cutscene.py."""
    rng = np.random.default_rng(7)
    area = np.clip(rng.normal(1500, 450, N_POINTS), 600, 3200)  # square feet
    price = 45_000 + 95 * area + 0.012 * (area - 1500).clip(0) ** 2 * 10 + rng.normal(0, 28_000, N_POINTS)
    return area.reshape(-1, 1), np.clip(price, 60_000, None)


def pick_rows(p1, n=N_ROWS):
    """Test-row indices: up to four uncertain rows (p1 in 0.2..0.8, nearest 0.5 first), then confident
    ones, balanced between the classes. Returned in test-set order."""
    mid = [i for i in np.argsort(np.abs(p1 - 0.5), kind="stable") if 0.2 <= p1[i] <= 0.8][:4]
    rest = [i for i in range(len(p1)) if i not in mid]
    low = [i for i in rest if p1[i] < 0.5]
    high = [i for i in rest if p1[i] >= 0.5]
    picked = list(mid)
    while len(picked) < n and (low or high):
        for pool in (low, high):
            if pool and len(picked) < n:
                picked.append(pool.pop(0))
    return sorted(picked)


def classification(make):
    d = load_breast_cancer()
    X_tr, X_te, y_tr, y_te = train_test_split(d.data, d.target, test_size=0.25, stratify=d.target, random_state=SEED)
    model = make().fit(X_tr, y_tr)
    proba = model.predict_proba(X_te)
    classes = [int(c) for c in model.classes_]
    idx = pick_rows(proba[:, classes.index(1)])
    return {
        "dataset": "breast-cancer", "estimator": type(model).__name__,
        "classes": classes, "class_names": [str(d.target_names[c]) for c in classes],
        "rows": [{"row": n, "y_true": int(y_te[i]), "proba": [round(float(v), 3) for v in proba[i]]}
                 for n, i in enumerate(idx)],
    }


def regression(make):
    X, price = ames_sample()
    X_tr, X_te, y_tr, y_te = train_test_split(X, price, test_size=0.25, random_state=SEED)
    model = make().fit(X_tr, np.log1p(y_tr))
    pred_log = model.predict(X_te)
    pred = np.expm1(pred_log)
    return {
        "dataset": "ames", "estimator": type(model).__name__, "target_transform": "log1p",
        "rows": [{"row": n, "y_true": int(round(y_te[n])), "y_pred_log": round(float(pred_log[n]), 3),
                  "y_pred": int(round(float(pred[n])))} for n in range(N_ROWS)],
    }


def main():
    root = Path(__file__).resolve().parent.parent
    dest = root / "content" / "cutscenes" / "outputs"
    dest.mkdir(parents=True, exist_ok=True)
    for page, (lib, make_c, make_r) in PAGES.items():
        out = {"page": page, "library": lib, "library_version": version(lib),
               "classification": classification(make_c), "regression": regression(make_r)}
        (dest / f"{page}.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
        mids = sum(0.2 <= r["proba"][out["classification"]["classes"].index(1)] <= 0.8
                   for r in out["classification"]["rows"])
        print(f"wrote {page}.json ({lib} {out['library_version']}, {mids} uncertain rows)")


if __name__ == "__main__":
    main()
