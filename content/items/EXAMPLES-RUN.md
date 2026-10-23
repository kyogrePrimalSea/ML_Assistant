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
| max-depth | scikit-learn | PASS |
| max-depth | xgboost | PASS |
| max-depth | lightgbm | PASS |
| randomizedsearchcv | scikit-learn | PASS |

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
