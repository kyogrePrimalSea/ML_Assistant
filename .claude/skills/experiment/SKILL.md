---
name: experiment
description: Design, run, preserve, and analyse AI Brand-inator experiments that test unresolved product or methodology hypotheses between discovery and architecture. Use for controlled live-model or offline trials, comparisons, and evidence capture before implementation; do not use for production implementation.
---

# Experiment

Turn a testable uncertainty into reproducible evidence without silently promoting the result into methodology or architecture.

This skill is the empirical bridge in the workflow:

Discovery → Experiment → Architecture → Implementation

## Required Context

Always read `docs/EXPERIMENTS.md` first. Then read only the relevant approved methodology, project thinking, prior evidence, or provider configuration needed for the test.

Use `docs/EXPERIMENTS.md` as the concise registry. Store exact experimental artifacts under `docs/evidence/` and link them from the registry.

## Workflow

1. State one falsifiable hypothesis and identify the specific uncertainty it addresses.
2. Check the registry and existing evidence to avoid duplicating a completed or already planned experiment.
3. Before execution, add or refine a `Planned` registry entry with controlled variables, prompts or sample, model/configuration, comparison basis, expected observations, and intended evidence path.
4. For comparisons, change only the variable being tested. Reuse exact prompts and configuration wherever possible.
5. Obtain explicit user authorization in the current session before making paid live API calls. Give a bounded call count or cost expectation when it can be estimated.
6. Run calls sequentially by default so outputs and failures remain attributable. Stop and report repeated failures rather than silently changing configuration.
7. Preserve exact requests, complete responses, annotations, visible citations, errors, retries, provider identifiers, usage, search counts, and costs. Never persist credentials or authorization headers.
8. Analyse observed evidence separately from interpretation. Record material anomalies and counterexamples, not only supporting cases.
9. Update the registry using the headings `Hypothesis`, `Experiment findings`, and `Conclusion`. Mark the status and classify a completed conclusion as `Supported`, `Not supported`, or `Inconclusive`.
10. Present the result to the user. Move to the architect skill only when the user accepts a sufficiently supported requirement for technical design.

## Reporting & Explanation Format

When writing up or explaining a result, follow `references/report-format.md` — the
user's required presentation format. In short: name the unit of analysis and build
every interval by bootstrapping that unit; measure every claim against an A/A noise
floor using non-overlap of 95% CIs; report point + CI with the bootstrap `B` and
seed; use named standard-library calls (`scipy`/`numpy`) not hand-rolled math and
flag their gotchas (JS distance vs divergence, auto-normalization, log base); state
each metric's exact definition and decision id and which test it feeds; include one
**real** worked example (raw answer → counts → vector → the actual call → its
output); show full tables for **all** arms plus per-entity movers with CIs; and keep
the honest caveats (scope, multiplicity/FDR, effect-not-mechanism, counterexamples).
This governs presentation only; it changes no metric, methodology, or decision.

## Evidence Rules

- Keep the registry compact; do not duplicate raw responses there. The registry
  entry still carries the setup block, the full headline table and the conclusion,
  and links to the `docs/evidence/` report for the worked example and raw payloads.
- Prefer a readable Markdown report plus authoritative JSON when exact nested provider payloads matter. Use only Markdown when it can preserve all evidence exactly and more compactly.
- Retain failed attempts when they explain reproducibility, cost, or provider behaviour.
- Distinguish provider annotations, visible URL occurrences, inferred associations, and citation correctness.
- Do not alter existing metrics as a side effect of an experiment unless that metric change is the stated test.
- Label facts, assumptions, findings, hypotheses, and conclusions distinctly.

## Boundaries

Do not:

- change `docs/METHODOLOGY.md`, `docs/DECISIONS.md`, or `docs/ARCHITECTURE.md` merely because an experiment completed
- treat one successful sample as universal behaviour
- modify prompts or schemas mid-comparison without recording a new condition
- omit inconvenient failures, ambiguous cases, or costs
- implement production code or create implementation tasks under this skill
- expose, print, or commit API keys or `.env` contents

An experiment conclusion is evidence for a later user decision. It is not itself that decision.
