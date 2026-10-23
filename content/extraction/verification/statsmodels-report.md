# statsmodels 0.15.0 extraction and docs cross-check (T007)

Inventory items: 41. Extraction records: 41 (after T013).

| Status | Before overrides | After overrides |
| --- | --- | --- |
| match | 29 | 32 |
| mismatch | 9 | 6 |
| unparsed / fetch_error | 0 | 0 |
| no record (extractor failure) | 3 | 3 |

Overrides written: 4 (OLSInfluence, ARIMA, ETSModel, UnobservedComponents). Each sets `attributes` to the properties listed on the official page that numpydoc did not capture.

## Re-run after extractor fixes (T013)

All 41 items now have records (STL, plot_acf, plot_pacf extracted). The kwargs-expansion extras (OLS `weights`, SARIMAX `k_states`, etc.) are gone.

| Status | Before overrides (first run) | After T013 + overrides |
| --- | --- | --- |
| match | 29 of 38 | 19 of 41 |
| mismatch | 9 | 22 |
| no record | 3 | 0 |

Mismatch count rose because the extractor now collects documented public properties as attributes, while verify_docs.py parses only the Attributes field list. Every one of the 79 `missing_in_docs` attribute names (endog_names, exog_names, df_model, df_resid, link, param_names, start_params, state_names, etc.) was checked: each appears on the official page (Properties table or class index). Extraction is correct; these are verifier parser limits (verifier tool issue, not fixed). The 22: Logit, Probit, MNLogit, Poisson, NegativeBinomial (discrete), Binomial, Gamma, Gaussian, NegativeBinomial, Poisson, Tweedie (families), GLM, GLS, OLS, WLS, RLM, OLSInfluence, ARIMA, ETSModel, SARIMAX, UnobservedComponents, VARMAX.

## Overrides (4, all still needed, no clashes)

OLSInfluence (17 attrs), ARIMA (4: initial_variance, initialization, loglikelihood_burn, tolerance), ETSModel (5), UnobservedComponents (4). The extractor still does not find these (listed on the page Attributes/Properties but not collected). Each override sets `attributes` = extractor's current list plus the missing ones (no duplicate names), so it must be regenerated if the extractor changes. After overrides, `missing_in_extraction` is empty for every item.

## Tool issues

1. verify_docs.py reads only the Attributes field list, not the Properties table (cause of the 22).
2. Override mechanism cannot remove or append list entries (whole-list replacement only).
3. Results-class attributes and fit()-result methods are out of scope.

## Spot check (13 of 32 matches)

Independent script compared each record's parameter names and defaults, methods and attributes against the cached official page text, then hand-checked the unresolved cases (quoting differences only): Logit, Probit, Gaussian, Tweedie, MixedLM, acorr_ljungbox, variance_inflation_factor, AutoReg, ThetaModel, MSTL, kpss; scipy ones are listed in the SciPy report. All consistent.


## T014 re-run

After the T014 verifier/extractor fixes and full regeneration: 41 match / 0 mismatch / 0 unparsed / 0 fetch_error / 0 no record (of 41 items).

The page lists properties in an autosummary "Properties" table; these now count as documented attributes. This removed the `missing_in_docs` mismatches (endog_names, exog_names, df_model, df_resid, ...) and exposed documented properties the extractor had missed. The 4 earlier full-list overrides (OLSInfluence, ARIMA, ETSModel, UnobservedComponents) were converted to `op: append` of only the missing attributes (ARIMA also gains `params_complete`), and `append` overrides were added for Logit, Poisson, Probit, the 6 GLM families, STL, SARIMAX and VARMAX (page-table descriptions, blank where the page gives none). No remaining non-matches.
