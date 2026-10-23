# Design adjustments (contrast)

Spec section 10 values are used as written except where the WCAG contrast check
(`app/scripts/check-contrast.mjs`, enforced by `app/src/styles/contrast.test.ts`)
fails. Each adjustment changes lightness only, within the same HSL hue and
saturation, by the smallest step that passes 4.5:1 against every background the
token is used on. Spec text is unchanged; tokens live in `app/src/styles/tokens.css`.

| # | Token | Theme | Spec | Adjusted | Ratio before | Ratio after (worst background) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `--text-subtle` | Light | `#7D8299` | `#656A81` | 3.24 on code-bg (3.27 on surface-2, 3.49 on bg) | 4.56 on code-bg (4.60 on surface-2) |
| 2 | `--text-subtle` | Dark | `#6E7699` | `#848BA9` | 3.43 on surface-2 (3.81 on surface-1) | 4.54 on surface-2 |
| 3 | Stage Select | Light | `#4E7A16` | `#4D7816` | 4.40 on canvas | 4.52 on canvas |

Notes:

- Backgrounds checked for text tokens: bg, surface-1, surface-2 and code-bg.
  Stage colours are checked as text on canvas, bg and surface-1 (4.5:1) and as
  dots on surface-2 (3:1). Relationship line colours are checked on canvas (3:1).
- Everything else in spec 10.2 to 10.5 passes as written in both themes.
- Not checked, by design: `--border` and `--border-strong` are decorative
  dividers and sit below 3:1 on the page background. Controls therefore do not
  rely on the border alone; they also have a filled surface or a text label.
