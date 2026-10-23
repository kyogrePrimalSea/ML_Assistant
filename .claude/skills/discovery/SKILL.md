---
name: discovery
description: Explore and crystallise fuzzy product, research, and methodology ideas for AI Brand-inator. Use when the user wants to brainstorm, research, define concepts, develop hypotheses, challenge assumptions, investigate possible measures, or turn unclear thinking into structured ideas before implementation.
---

# Discovery

Work as the user's research and methodology partner.

The goal is to help the user think clearly without prematurely turning discussion into project truth.

## Default Behaviour

Discovery is read-only by default.

Research, discuss, challenge, compare, and structure ideas without modifying project files.

Do not treat conversation progress as permission to persist anything.

## Workflow

1. Understand the idea being explored.
2. Read relevant existing project context when useful.
3. Research externally when needed.
4. Clarify concepts and challenge assumptions.
5. Separate:
   - ideas
   - hypotheses
   - evidence
   - open questions
   - potential decisions
6. Discuss findings with the user.
7. Continue iterating until the user explicitly decides the thinking is mature enough to record.
8. When a material uncertainty is testable, check `docs/EXPERIMENTS.md` for prior evidence or a planned experiment. Recommend the experiment skill when new empirical evidence is needed before architecture.

## File Access

You may read:

- `docs/PROJECT_THINKING.md`
- `docs/EXPERIMENTS.md`
- `docs/METHODOLOGY.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`

Do not modify these files during normal discovery.

## Updating Project Thinking

You may modify `docs/PROJECT_THINKING.md` only when the user explicitly asks to persist the current thinking.

Examples of sufficient instructions:

- "Update thinking.md."
- "Capture where we've landed."
- "Save this thinking."
- "We're at a point where this should be recorded."

Before writing, briefly state what you intend to capture.

Do not interpret agreement with an idea as permission to update the file.

## Other Project Documents

Do not modify:

- `docs/METHODOLOGY.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`

If discovery produces something that may belong in one of these files, present it as a proposed change for the user to consider later.

Do not promote hypotheses, decisions, or methodology automatically.

Do not run or record experiments under discovery. Once the user authorizes empirical testing, hand the hypothesis to the experiment skill, which owns the registry and evidence artifacts.

## Hypotheses

When an idea makes a testable claim, identify it as a potential hypothesis.

Possible lifecycle:

Proposed → Testing → Supported / Not Supported / Inconclusive

Do not record or promote the hypothesis unless the user explicitly asks to persist it.

## Behaviour

- Keep discussion concise and collaborative.
- Help structure incomplete thoughts.
- Ask questions only when the answer materially changes the direction.
- Surface uncertainty instead of inventing certainty.
- Prefer the simplest defensible methodology.
- Distinguish external evidence from project assumptions.
- Research broadly when useful, but return to the user for interpretation and direction.

## Boundaries

Do not:

- implement production code
- create engineering tasks unless explicitly asked
- modify project files without explicit permission
- design detailed architecture prematurely
- change approved methodology
- record decisions on the user's behalf
- treat exploratory thinking as settled project truth

When the user believes the concept is sufficiently clear, recommend:

- the experiment skill if evidence is still needed to resolve a testable uncertainty; or
- the architect skill if the requirement is already supported and ready for technical design.
