# Experiment report & explanation format

How the user wants every experiment written up and explained. This governs the
*presentation* of evidence — it does **not** change any metric definition,
methodology, or decision (those rules live in `AGENTS.md` and are unaffected).

The full rich version lives in the `docs/evidence/` report. The
`docs/EXPERIMENTS.md` registry entry carries the same setup block, headline table
and conclusion, and links to the report for the worked example and raw payloads.

## Principles (the "why" the user cares about)

1. **The unit of analysis is explicit.** State what the independent replicate is
   (here: the prompt) and build every interval from resampling that unit. Say why
   brands are **not** independent replicates (Share of Voice is compositional — one
   response names all brands jointly; more brands buy *information/sensitivity*, not
   more sample size). Testing brands separately needs a multiplicity correction.
2. **Every claim is measured against a noise floor.** Carry an **A/A arm** (the
   baseline condition run a second time). An effect only counts if its 95% interval
   does **not overlap** the floor's 95% interval. The floor has its own CI; show it.
3. **Confidence intervals, always, by bootstrap over the unit.** Report point + 95%
   CI. State the method (cluster/percentile bootstrap over prompts), the replicate
   count `B`, and the RNG seed. Interval-capable metrics are per-response averages;
   a single pooled ratio has no interval and should not masquerade as one.
4. **Standard libraries, never hand-rolled math.** Use `scipy`/`numpy`/`sklearn` and
   name the exact call. Flag the library's behaviour that bites: JS *distance*
   (`scipy.spatial.distance.jensenshannon`) is the **√** of JS *divergence*; state
   which you report. Note silent input auto-normalization and the log base.
5. **Exact metric definitions inline.** Write the formula for each metric used, with
   its approved decision id (e.g. Expected Share of Voice = D056), and say which
   metric feeds which test (compositional share → JSD; per-brand ranking → Kendall
   τ-b; rates/averages → bootstrapped CIs).
6. **A real worked example.** Show one concrete chain end to end:
   raw model answer → named-brand counts → per-response contribution vector →
   the actual `scipy` call → its printed output. Use genuine data from the run, not
   a reconstruction. This is non-negotiable; the math must be legible to a reader.
7. **Full tables, every arm.** Do not drop arms from the write-up. If four arms ran,
   all four appear in the headline table (point + CI + rank statistic). Per-entity
   movers get a table with the signed difference and its CI, starred where the CI
   excludes 0. Note monotonic **dose-response** when the axis is ordinal.
8. **Identify the POV / target brand(s)** explicitly, and say whether the claim is
   about that brand or the whole landscape.
9. **Honest caveats, counterexamples included.** Scope limits (model/mode/universe),
   multiplicity / FDR status, effect-vs-mechanism, how the floor was estimated, and
   any arm that did **not** clear the floor. Report the inconvenient result in the
   same voice as the convenient one.
10. **Cost and reproduction.** Total spend, hard ceiling, per-launch range, call
    count, retries. Then the exact commands (dry-run first, then live, then analyse)
    and the evidence file links.
11. **Classification + effect on methodology.** Classify `Supported` /
    `Not supported` / `Inconclusive` against a rule fixed before the run, then state
    the effect on methodology — which is **None** unless a decision was recorded.

## Section skeleton (evidence report)

```
# <EXP-id> (<scope>) — <one-line question>
**Date / Status / Conclusion** (Conclusion = the classification + the headline in one sentence)

## What this is (and is not)      # scope vs the full approved design; link the frozen pre-registration
## Method (frozen)                # categories/arms, the single varied input, call count, metric definitions,
                                  #   which stat on which metric, the exact scipy/numpy calls, unit of analysis,
                                  #   bootstrap B + seed, the A/A floor
## Cost                           # total, ceiling, per-launch range, calls, retries
## Worked example                 # ONE real chain: raw answer -> counts -> vector -> scipy call -> output
## Results                        # headline table (ALL arms: point + 95% CI + rank stat, vs floor),
                                  #   dose-response note, then per-entity movers table (diff + CI, * excludes 0)
## Conclusion                     # classification, what cleared the floor and what did not
## Honest caveats                 # scope, multiplicity/FDR, effect-not-mechanism, floor estimation, counterexamples
## Reproduction                   # dry-run / live / analyse commands + evidence links
## Effect on methodology          # None unless a decision was recorded
```

## Decision rule for "did it clear the floor?"

Non-overlap of the 95% CIs is the reported test. The pooled ratio of means (e.g.
"persona JSD ≈ 3× the floor") is a one-number summary, **not** a test — label it so.
