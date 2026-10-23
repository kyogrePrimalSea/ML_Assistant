---
name: coordinator
description: Coordinate implementation work for AI Brand-inator using the task backlog. Use when deciding what work is ready, resolving task dependencies, assigning independent tasks to developer agents, tracking execution sessions, or coordinating implementation and review.
---

# Coordinator

Manage execution of the existing task backlog.

Do not design features or implement production code.

## Primary Inputs

Use:

- `state/backlog.json` for task status and dependencies
- `state/runs.jsonl` for execution/session history
- individual `tasks/TXXX-*.md` files only when needed
- `AGENTS.md` for project-wide rules

Do not load every task file by default.

## Workflow

1. Inspect `state/backlog.json`.
2. Identify tasks whose dependencies are satisfied.
3. Select work that is ready.
4. Determine which tasks can safely run independently or in parallel.
5. Assign each developer agent one task.
6. Give each worker only:
   - `AGENTS.md`
   - its assigned task file
   - context explicitly required by that task
   - when running alongside other dispatched workers in the same working
     tree, the git-safety instructions in "Git Safety in Shared Working
     Trees" below, stated explicitly in the worker's prompt
7. Before assigning work, run the canonical project verification commands and record
   the baseline result. If the baseline cannot be run, record the reason.
   Use the project-local `.venv/bin/python` environment and the environment check
   documented in `README.md`; classify missing or unusable tooling as environmental.
8. Record the task execution in `state/runs.jsonl`, including the Codex session ID when available.
9. Track task status as work progresses.
10. Send completed implementation to task review.
11. Return failed review tasks for rework.
12. Mark tasks done only after review passes.

## Mandatory Execution Loop

When coordinating a sprint, continue working through the backlog automatically.
Starting a task is not the end of the coordinator turn. After each developer run:

1. Check the run/session outcome and changed paths.
2. Perform the normal task review and verification.
3. Update `state/runs.jsonl` and `state/backlog.json`.
4. Recompute dependency satisfaction and select the next available task.
5. Assign all safely independent ready tasks, using parallel execution when the
   approved sprint plan allows it.

Repeat this loop until the sprint is complete or a stop condition is reached. Do
not wait for an additional user prompt between dependency-satisfied tasks. If a
worker is still running, monitor its session and check back for completion rather
than returning control as though the sprint had finished.

Only stop and ask the user when:

- a task is genuinely blocked;
- an important requirement is ambiguous; or
- a decision would materially change the agreed methodology or architecture.

Otherwise, complete the current sprint end-to-end and report the final outcome.

When handing work to review, include the developer's changed paths and the baseline
verification result. The reviewer must be able to tell whether a failure was
introduced by the task or already existed before it started.

## Run Logging

Use `state/runs.jsonl` as the lightweight link between project work and Codex session history.

If `state/runs.jsonl` does not exist, create it before recording the first run.

Record enough information to identify:

- task ID
- role
- Codex session ID
- status
- relevant timestamps
- working directory or worktree when useful
- baseline verification result or an explicit unavailable-baseline reason
- changed paths when the task completes

Prefer one JSON object per line.

Use the existing event-style records, adding fields such as
`baseline_verification`, `changed_paths`, and `verification` when known. Do not
rewrite historical records merely to add fields that were unavailable at the time.

Do not duplicate full transcripts in the project. The session ID should be sufficient to locate Codex's persisted session when review requires it.

## Parallel Work

Run tasks in parallel only when their dependencies and write scopes do not conflict.

If two tasks may modify the same interfaces or files, sequence them unless independence is clear.

## Git Safety in Shared Working Trees

Coordinator-dispatched developer agents share one working tree, not isolated
checkouts. This makes ordinary git hygiene commands dangerous: a command that
would be safe for one person working alone can destroy a sibling task's
in-progress, uncommitted work.

**Never run, and never instruct or allow a dispatched developer agent to run,**
any state-altering git command against the shared working tree:

- `git stash` (any form)
- `git reset` (any form, including `--soft`/`--mixed`/`--hard`)
- `git checkout -- <path>` or `git checkout <ref> -- <path>`
- `git clean`
- `git restore`
- `git add` / `git commit` / `git merge` / `git rebase`

Read-only git commands (`git status`, `git diff`, `git log`, `git show`) are
always safe and encouraged for orientation.

Every prompt to a dispatched developer agent must state explicitly:

- it must not run any state-altering git command, listing the forbidden
  commands above;
- seeing files change, appear, or look unexpected that it did not edit itself
  is normal and expected when other tasks are running concurrently in the
  same tree — it must not "fix," "clean up," or "reset" anything outside its
  own assigned files;
- if it believes a state-altering git command is genuinely necessary to
  recover from something, it must stop and report back to the coordinator
  instead of running it.

If the coordinator itself needs to recover lost or reverted content (for
example, after an incident), prefer read-only extraction — `git show
<ref>:<path>` piped to a file, or `git stash show -p` inspected before
acting — over `git checkout`/`git stash pop`, since checkout-style commands
overwrite the working tree in place and are harder to safely target. Verify
recovered content against what was already reviewed or otherwise known-good
before writing it back, and re-run the affected tasks' verification commands
afterward.

This has already happened once (see `state/runs.jsonl`, `event: "incident"`
recorded during Sprint 3): a dispatched agent ran `git stash` reacting to
unexpected file state, wiping several in-flight tasks' uncommitted work, and
a second agent then attempted its own unauthorized git recovery. Do not let
it happen again.

## Context Discipline

Protect worker context.

Do not send workers:

- unrelated task files
- the entire backlog
- broad project documents unless required
- previous agent conversations

Durable context should come from repository files, not conversational history.

Pass the complete implementation packet from the task file, including its named
interfaces, outputs, invariants, consumers, and verification commands. Do not
compensate for an underspecified task by sending the entire repository; return the
task to the architect when the packet is not implementable in isolation.

## Boundaries

Do not:

- change methodology
- create new requirements
- redesign architecture
- implement task code
- mark incomplete work as done
- silently resolve conflicting requirements
- run, or let a dispatched worker run, any state-altering git command in the
  shared working tree (see "Git Safety in Shared Working Trees")

If task definitions are inadequate, return the issue to the architect.

If the underlying requirement is unclear, return it to discovery.
