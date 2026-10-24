# Example snippet runs

Run date: 2026-10-24. Interpreter: `.venv/bin/python` (3.14.7). Each snippet is run alone, as pasted, in an empty directory with no network.

| Record | Library tab | Result |
| --- | --- | --- |
| learning-curve | scikit-learn | PASS |
| precision-score | scikit-learn | PASS |
| feature-importances | scikit-learn | PASS |
| feature-importances | xgboost | PASS |
| xgboost | xgboost | PASS |
| selectkbest | scikit-learn | PASS |
| timeseriessplit | scikit-learn | PASS |
| pipeline | scikit-learn | PASS |
| smote | imbalanced-learn | PASS |
| standardscaler | scikit-learn | PASS |
| train-test-split | scikit-learn | PASS (T026) |
| onehotencoder | scikit-learn | PASS (T026) |
| r2-score | scikit-learn | PASS (T026) |
| max-depth | scikit-learn | PASS |
| max-depth | xgboost | PASS |
| max-depth | lightgbm | PASS |
| randomizedsearchcv | scikit-learn | PASS |
| gradient-boosting | scikit-learn | PASS |
| hist-gradient-boosting | scikit-learn | PASS |
| lightgbm | lightgbm | PASS |
| n-estimators | scikit-learn | PASS |
| n-estimators | xgboost | PASS |
| n-estimators | lightgbm | PASS |
| learning-rate | scikit-learn | PASS |
| learning-rate | xgboost | PASS |
| learning-rate | lightgbm | PASS |
| early-stopping | scikit-learn | PASS |
| early-stopping | xgboost | PASS |
| early-stopping | lightgbm | PASS |

Failures: 0

## learning-curve / scikit-learn

```text
[ 48 120 240]
[0.99 0.99 0.98]
[0.97 0.98 0.98]
```

## precision-score / scikit-learn

```text
0.9882352941176471
```

## feature-importances / scikit-learn

```text
[0.03 0.03 0.03 0.04 0.88]
```

## feature-importances / xgboost

```text
[0.02 0.02 0.02 0.04 0.91]
```

## xgboost / xgboost

```text
498
```

## selectkbest / scikit-learn

```text
(569, 30) -> (569, 5)
['mean perimeter', 'mean concave points', 'worst radius', 'worst perimeter', 'worst concave points']
```

## timeseriessplit / scikit-learn

```text
0 train [0 1 2] test [3 4 5]
1 train [0 1 2 3 4 5] test [6 7 8]
2 train [0 1 2 3 4 5 6 7 8] test [ 9 10 11]
```

## pipeline / scikit-learn

```text
[0.996 0.996 0.996 0.997 0.998]
```

## smote / imbalanced-learn

```text
before Counter({np.int64(0): 897, np.int64(1): 103})
after Counter({np.int64(0): 897, np.int64(1): 897})
```

## standardscaler / scikit-learn

```text
[ 0. -0. -0.]
[1. 1. 1.]
```

## max-depth / scikit-learn

```text
5
```

## max-depth / xgboost

```text
4
```

## max-depth / lightgbm

```text
5
```

## randomizedsearchcv / scikit-learn

```text
{'max_depth': 10, 'min_samples_leaf': 2}
0.72
```

## gradient-boosting / scikit-learn

```text
203
0.8874156441098768
```

## hist-gradient-boosting / scikit-learn

```text
290
0.8818508462404138
```

## lightgbm / lightgbm

```text
300
```

## n-estimators / scikit-learn

```text
50 50
```

## n-estimators / xgboost

```text
50
```

## n-estimators / lightgbm

```text
50
```

## learning-rate / scikit-learn

```text
0.01 0.438
0.1 0.86
0.5 0.79
```

## learning-rate / xgboost

```text
0.01 0.507
0.1 0.801
0.5 0.715
```

## learning-rate / lightgbm

```text
0.01 0.513
0.1 0.883
0.5 0.848
```

## early-stopping / scikit-learn

```text
334 237
```

## early-stopping / xgboost

```text
57
```

## early-stopping / lightgbm

```text
152
```

## T029 re-runs (2026-10-24)

Re-run after what_comes_out and long-line edits; each snippet alone, as pasted, in an empty directory (`python -I -W ignore`). All PASS.

## xgboost / xgboost (T029)

```text
498
```

## xgboost / what comes out (xgboost) (T029)

```text
(143, 2)
(143,)
(442,)
```

## lightgbm / lightgbm (T029)

```text
300
```

## lightgbm / what comes out (lightgbm) (T029)

```text
(143, 2)
(143,)
(442,)
```

## hist-gradient-boosting / scikit-learn (T029)

```text
290
0.8818508462404138
```

## hist-gradient-boosting / what comes out (scikit-learn) (T029)

```text
(143, 2)
(143,)
(442,)
```

## gradient-boosting / scikit-learn (T029)

```text
203
0.8874156441098768
```

## gradient-boosting / what comes out (scikit-learn) (T029)

```text
(143, 2)
(143,)
(442,)
```

## n-estimators / scikit-learn (T029)

```text
50 50
```

## n-estimators / xgboost (T029)

```text
50
```

## n-estimators / lightgbm (T029)

```text
50
```

## early-stopping / scikit-learn (T029)

```text
334 237
```

## early-stopping / xgboost (T029)

```text
57
```

## early-stopping / lightgbm (T029)

```text
152
```

## learning-rate / scikit-learn (T029)

```text
0.01 0.438
0.1 0.86
0.5 0.79
```

## learning-rate / xgboost (T029)

```text
0.01 0.507
0.1 0.801
0.5 0.715
```

## learning-rate / lightgbm (T029)

```text
0.01 0.513
0.1 0.883
0.5 0.848
```

## max-depth / scikit-learn (T029)

```text
5
```

## max-depth / xgboost (T029)

```text
4
```

## max-depth / lightgbm (T029)

```text
5
```

## feature-importances / scikit-learn (T029)

```text
[0.03 0.03 0.03 0.04 0.88]
```

## feature-importances / xgboost (T029)

```text
[0.02 0.02 0.02 0.04 0.91]
```

## onehotencoder / scikit-learn (T029)

```text
['Street_Grvl' 'Street_Pave']
[[0. 1.]
 [0. 0.]]
```
