---
name: task-review
description: Review a completed AI Brand-inator implementation task against its specification and acceptance criteria. Use when a developer claims a TXXX task is complete and the work needs to be verified, tested, approved, or returned for rework.
---

# Task Review

Act as the quality gate for one implementation task.

Review the resulting work against the task specification rather than redesigning the feature.

## Primary Inputs

Read:

- `AGENTS.md`
- the assigned `tasks/TXXX-*.md`
- the implementation or diff relevant to that task
- tests relevant to that task

Use `state/runs.jsonl` to identify the developer session when process history may help explain the implementation.

Do not load unrelated tasks or broad project context unless required.

## Workflow

1. Read the task specification.
2. Identify its acceptance criteria and verification method.
3. Inspect the implementation.
4. Run or inspect the required tests.
5. Check each acceptance criterion explicitly.
6. Inspect the developer session only when useful for resolving uncertainty or understanding a failure.
7. Compare verification results with the coordinator's recorded baseline. Classify
   each failure as introduced by the task, pre-existing, environmental, or
   unresolved; do not pass failing acceptance criteria merely because a failure is
   pre-existing.
   For environment failures, record the canonical project-local command attempted
   and the working fallback, if one exists.
8. Return one outcome:
   - PASS
   - REWORK
9. Record the review result in project state, including the outcome, verification
   commands, changed paths when available, and baseline-versus-introduced failure
   classification.

## Review Standard

PASS only when:

- the stated objective is satisfied
- all acceptance criteria pass
- required tests pass
- the implementation stays within task scope
- no obvious regression or broken interface has been introduced

Do not fail work because of personal implementation preferences when the task requirements are satisfied.

## Session History

When needed:

1. Find the task's developer session ID in `state/runs.jsonl`.
2. Locate the corresponding persisted Codex session.
3. Inspect only the relevant parts of the session.

Use session history to diagnose issues such as:

- misunderstood requirements
- missing task context
- repeated failed approaches
- unnecessary context loading
- acceptance criteria being ignored

Do not treat the developer's reasoning as proof that the implementation is correct. Verify the resulting work directly.

## Review Output

For PASS:

- state that the task passed
- briefly identify what was verified

For REWORK:

- identify the failed acceptance criteria
- explain the concrete issue
- specify what must change

Keep feedback scoped to the task.

## State Updates

After review:

- PASS → task may move to `Done`
- REWORK → task returns to `In Progress`

Record the review session and result in `state/runs.jsonl`.

Update `state/backlog.json` accordingly.

## Boundaries

Do not:

- expand task scope
- redesign architecture unless the implementation exposes a genuine architectural issue
- change methodology
- silently fix major issues yourself
- approve work with failing acceptance criteria

If the task itself is flawed or underspecified, return it to the architect rather than forcing the developer to guess.
