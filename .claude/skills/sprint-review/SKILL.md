---
name: sprint-review
description: Review a completed AI Brand-inator sprint across multiple tasks, reviews, and Codex sessions to identify repeated problems, workflow inefficiencies, weak task design, context waste, architecture issues, or methodology gaps. Use after a sprint to recommend improvements to the project's agent system and working process.
---

# Sprint Review

Review how the project worked across a completed sprint.

Focus on improving the system, not re-reviewing every implementation detail.

## Primary Inputs

Use:

- `state/backlog.json`
- `state/runs.jsonl`
- completed task files from the sprint
- task-review outcomes
- `docs/SPRINT_RETROSPECTIVE.md`
- relevant Codex sessions when deeper process evidence is needed

Read project documents such as `AGENTS.md`, Skills, architecture, or methodology only when evaluating a proposed improvement to them.

## Workflow

1. Identify the tasks included in the sprint.
2. Review their outcomes and review results.
3. Inspect run/session history for repeated patterns.
4. Look for systemic issues rather than isolated mistakes.
5. Check whether hypotheses were tested and their outcomes recorded.
6. Identify improvements worth making.
7. Record the retrospective in `docs/SPRINT_RETROSPECTIVE.md`.
8. Recommend changes before applying them.

## Look For

Examples include:

- repeated developer misunderstandings
- missing task context
- unnecessary context loading
- tasks that were too large or too small
- repeated review failures
- architecture ambiguity
- unclear methodology
- duplicated instructions
- unnecessary agent or workflow complexity
- recurring manual work that could become a Skill or script
- Skills that are too verbose or ineffective
- stale project documentation
- hypotheses left unresolved despite available evidence

## Session Review

Use `state/runs.jsonl` to locate relevant developer and reviewer session IDs.

Inspect session transcripts selectively.

Do not read every session in full by default.

Prioritise sessions associated with:

- failed or repeated reviews
- unusually long or confused execution
- repeated retries
- conflicting interpretations
- excessive context loading
- work that exposed a systemic issue

## Hypothesis Check

For hypotheses touched during the sprint, check:

- Was the hypothesis actually tested?
- Was evidence recorded?
- Was the result marked Supported, Not Supported, or Inconclusive?
- Does the result justify any methodology or decision update?
- Are stale hypotheses still marked Testing?

Do not promote hypotheses automatically.

## Recommendations

Group recommendations by target where useful:

- `AGENTS.md`
- Skills
- task structure
- coordinator workflow
- review process
- architecture
- methodology
- testing
- context efficiency

Prefer a small number of high-value changes.

Do not recommend changes solely for theoretical cleanliness.

## Approval Rule

Do not silently modify governance, methodology, architecture, or Skill behaviour.

Record recommended changes first.

Apply changes only after they are deliberately approved.

## Retrospective Output

For each sprint, record:

- what worked
- what caused friction
- repeated mistakes or inefficiencies
- hypotheses tested
- recommended changes
- approved changes
- rejected or deferred changes

Keep the retrospective concise and evidence-based.

## Boundaries

Do not:

- turn isolated mistakes into new global rules without evidence
- add complexity without a demonstrated need
- rewrite project documentation unnecessarily
- re-open completed tasks unless a meaningful defect is found
- treat agent session reasoning as more authoritative than actual outputs and tests

Prefer simplifying the system when possible.
