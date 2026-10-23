# SciPy 1.18.1 extraction and docs cross-check (T007)

Inventory items: 10. Extraction records: 10 (after T013); 10 match, 0 mismatch, 0 overrides. curve_fit now extracts and matches.

| Status | Before | After |
| --- | --- | --- |
| match | 9 | 9 |
| mismatch / unparsed / fetch_error | 0 | 0 |
| no record (extractor failure) | 1 | 1 |

Overrides: 0.

## Non-matches

`scipy.optimize.curve_fit`: extractor failure, `'function' object has no attribute '__mro__'` (function with `**kwargs`; same bug as statsmodels `plot_acf`). No record exists, so an override cannot be applied. Needs a tool fix, then re-run.

## Spot check (3 of 9 matches)

least_squares (jac, method, loss defaults), normaltest (nan_policy), ttest_1samp (alternative, nan_policy): names and defaults agree with the page (differences were only backslash/quote escaping in rendered text). Combined with statsmodels, 16 of 41 matches were checked (more than 10%).
