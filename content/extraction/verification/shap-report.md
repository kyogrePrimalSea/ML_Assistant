# shap verification report

Pinned shap 0.54.1. 21 items, 21 records. Docs: shap.readthedocs.io/en/latest.
Counts: first run 9 match / 12 mismatch; after T013 update and overrides: 16 match / 5 mismatch (all 5 explained below as docs-side or upstream quirks, no extraction change warranted).

Resolved by override (9): the introspected default repr embeds a memory address; the page shows the stable form. Overrides set `default` to the page value: `link` = `<function identity>` (Explainer, ExactExplainer, LinearExplainer, PartitionExplainer, PermutationExplainer), `approximate` = `<object object>` (TreeExplainer, sentinel), `cmap` = `<matplotlib.colors.LinearSegmentedColormap object>` (plots.heatmap, plots.scatter, plots.violin).
Also fixed by the T013 update with no override: missing/extra parameters on KernelExplainer, LinearExplainer, SamplingExplainer, Explainer, PermutationExplainer, and the 15 Explanation attributes.

Remaining non-matches, recorded (docs page and installed version legitimately differ, or parser limitation)
- shap.plots.bar (clustering, clustering_cutoff, show_data, ax), shap.plots.beeswarm (ax, group_remaining_features), shap.plots.decision (feature_display_range, xlim), shap.plots.scatter (title, overlay): the upstream docstring omits the space before the colon (`clustering: np.ndarray or None`), so the page renders the whole text as the parameter name. The extraction has the correct names (checked against the signatures). No override.
- shap.PartitionExplainer: `partition_tree` is documented in the docstring and on the page's Parameters list but is not in the signature or the page's signature (stale upstream docstring). Extraction keeps it with param_kind documented_only. The coordinator may want to exclude it from rendered forms.

Spot-check by hand: TreeExplainer, KernelExplainer, plots.waterfall (plus plots.bar, beeswarm, decision, scatter, PartitionExplainer read against the page for the non-matches). No other gaps.

Parser issue: verify_docs treats the malformed docs parameter names above as missing_in_extraction.


## T014 re-run

After the T014 verifier/extractor fixes and full regeneration: 20 match / 1 mismatch / 0 unparsed / 0 fetch_error / 0 no record (of 21 items).

The malformed `name:type` docs names (plots.bar, beeswarm, decision, scatter) are now split, so those four match. No override needed.

Remaining non-match (1): `shap.PartitionExplainer` `partition_tree` is documented in the docstring and on the page but absent from the signature (stale upstream docstring); the extraction keeps it as documented_only.
