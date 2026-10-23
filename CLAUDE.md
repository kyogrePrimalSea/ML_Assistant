# ML Field Guide — Agent Instructions

Working name; the final app name is open (spec §14).

## Project Purpose

A single-user, dyslexia-first static web app that helps a data scientist recall
which library, function and variant fits each stage of a data science workflow
(**Lookup**), and assemble a validated pipeline that exports as a notebook
(**Build**). Full detail: `docs/spec.md`.

## Source of Truth

`docs/spec.md` is the complete, already-decided product, UX, content and visual
spec. Product thinking, research and decisions were handled elsewhere.

- Do not reopen, debate or redesign anything the spec decides.
- Do not run discovery or experiment workflows, and do not create
  `PROJECT_THINKING.md`, `METHODOLOGY.md`, `DECISIONS.md` or `EXPERIMENTS.md`.
  Where a skill refers to those files, read `docs/spec.md` instead.
- Anything marked **Open**, **v2** or **later wave** in the spec is not built in v1.
- If the spec is silent or ambiguous on something that materially affects the
  build, stop and ask the user. Do not invent requirements.
- Record lightweight technical choices the spec leaves open (for example exact
  library versions, folder layout) in `docs/ARCHITECTURE.md`, created when first
  needed.

## Hard Rules From the Spec

- **Never write content from memory.** Every item page is built from the
  official-docs extraction (spec §13 step 1), with source URL and library
  version recorded.
- **Every page is a filled-in form** (spec §5). Pages are rendered from schema
  records; relationship lines and validation rules are derived from schema
  fields, never hand-written separately.
- **Code snippets must run** when pasted into a real notebook: imports included,
  version stamp comment on the first line, pinned library versions.
- **Positions are precomputed and stored** with content; nothing re-lays-out on load.
- **Accessibility is a core constraint**: icon plus colour (never colour alone),
  WCAG AA contrast, reduced motion respected, full keyboard navigation.
- **Desktop first**; foldable phone (near-square) second.

## Workflow

This project uses the task workflow only: architect → coordinator → developer
agents → task-review.

- The user's main session acts as the orchestrator, using the `coordinator` skill.
- `state/backlog.json` holds epics, tasks, statuses and dependencies.
- `tasks/TXXX-*.md` holds one implementation packet per task, from
  `tasks/TEMPLATE.md`. Every task belongs to one epic.
- `state/runs.jsonl` logs task execution sessions.
- Epics follow the spec's build order (§13). Do not start an epic before its
  dependencies are done.
- Content pages carry a `reviewed` flag. The user reviews in batches, one stage
  at a time. Agents never set `reviewed: true`.

## Engineering Rules

- Prefer simple implementations over unnecessary abstraction.
- Make changes only within the scope of the current task.
- Use relative paths only. This folder will move out of its current parent.
- Never commit secrets, API keys, credentials or `.env` files.
- Add or update tests when behaviour changes.
- A task is not complete until its acceptance criteria have been checked. Do not
  mark failing work as complete.

## Skills

Skills in `.claude/skills/` were copied from another project (AI Brand-inator)
on 2026-10-24. Their workflow mechanics apply here; their references to AI
Brand-inator, methodology, experiments or Codex sessions do not. Read them as
pointing at this project and `docs/spec.md`.
