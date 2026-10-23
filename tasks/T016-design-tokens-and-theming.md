# T016 — Observatory tokens, typography, theming and component restyle

**Status:** Backlog

**Epic:** E03

## Objective

Implement the Observatory visual system (spec §10) as tokens, with light and dark
first-class, the theme following the system by default with a manual
light/dark/system override, and restyle the shadcn components with the tokens.

## Context

Spec §10.1–10.7 and §10.10–10.11 (modes must be a token-set swap), §11 (font
choice incl. dyslexia font, text size 90–130%, line spacing 1.5–2.0 — implement the
token hooks for these; the settings UI is E10). `docs/ARCHITECTURE.md` § "Web app".

## Dependencies

- T015

## Implementation Contract

### Outputs

- `app/src/styles/tokens.css`: every colour token in spec §10.2, severity pairs
  (§10.3), stage colours (§10.4), relationship line colours (§10.5) for both themes;
  spacing, radius, type scale, line-height, letter-spacing, motion durations and
  easing (§10.6–10.7). Theme selection via `data-theme="light|dark"` on `<html>`, with
  `prefers-color-scheme` when no explicit choice. A mode is one block of variables
  (`[data-mode="observatory"]`), so future modes are a swap.
- Variables the E10 settings will drive: `--font-body` (Atkinson by default, Lexend
  or OpenDyslexic as options), `--text-scale` (0.9–1.3), `--body-line-height` (1.5–2.0).
- `app/src/styles/base.css`: fonts via `@fontsource` imports, body styles (16px,
  line-height 1.6, +0.01em, left-aligned, no italics for emphasis), headings Space
  Grotesk 500 only at ≥18px, code JetBrains Mono with ligatures off
  (`font-variant-ligatures: none`), focus-visible ring, `prefers-reduced-motion` rule.
- Tailwind v4 `@theme` mapping so utilities use the tokens.
- `app/src/lib/theme.ts` + a `useTheme` hook: light/dark/system, persisted in
  localStorage (wrapped in try/catch).
- Restyle `app/src/components/ui/*` with tokens: 6px controls, 12px cards, pill chips,
  1px borders, no shadows in panels.
- `app/src/components/StatusChip.tsx` and `Callout.tsx`: severity (block/warn/tip/valid)
  as filled chip/callout with Tabler icon + label (§10.3). `StageBadge.tsx`: stage
  colour as dot/outline + stage icon, never filled (§10.4).
- `app/scripts/check-contrast.mjs` + a Vitest test: computes WCAG contrast for every
  text/background pair used (text, muted and subtle on bg, surface-1, surface-2;
  accent on bg/surfaces; on-accent on accent; severity text on its bg; stage colours
  on canvas and bg as text) in both themes. Must be ≥4.5:1 for text (≥3:1 for
  non-text graphics like stage dots). Where a spec value fails, adjust lightness only
  within the same hue, and record every adjustment (old → new, ratio) in
  `docs/DESIGN_ADJUSTMENTS.md`.
- `app/src/dev/Styleguide.tsx` at route `#/styleguide`: shows type scale, colours,
  chips, callouts, badges, buttons, tabs in the current theme (used for review screenshots).

### Rules

- Only edit files under `app/src/styles/`, `app/src/components/ui/`, the three new
  components, `app/src/lib/theme.ts`, `app/src/dev/`, `app/scripts/check-contrast.mjs`,
  its test, `docs/DESIGN_ADJUSTMENTS.md`, and add the styleguide route in `App.tsx`.
- No new npm dependencies.

## Acceptance Criteria

- [ ] Contrast test passes for every pair in both themes; adjustments recorded.
- [ ] Theme follows system by default; manual override persists; no flash of wrong theme.
- [ ] Styleguide renders in both themes; lint, tests and build pass.

## Verification

`cd app && npm run lint && npm test && npm run build`
