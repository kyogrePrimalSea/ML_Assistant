// WCAG contrast check for the Observatory tokens (spec section 10, task T016).
//
// Reads src/styles/tokens.css, resolves every colour per theme, and checks each
// text/background pair the app uses (4.5:1) and each non-text graphic (3:1).
// Run: node scripts/check-contrast.mjs   (exits 1 on any failure)
// The Vitest test imports checkContrast() and fails on the same conditions.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const STAGES = ['explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret']
const SEVERITIES = ['block', 'warn', 'tip', 'valid']
const SURFACES = ['bg', 'surface-1', 'surface-2']

/** Parse tokens.css into { light, dark } maps of resolved hex colours. */
export function parseTokens(css) {
  const parts = css.split(/\/\*\s*@(theme light|theme dark|derived)[^*]*\*\//)
  // parts: [preamble, marker1, body1, marker2, body2, ...]
  const segments = { light: {}, dark: [], derived: {} }
  for (let i = 1; i < parts.length; i += 2) {
    const marker = parts[i]
    const decls = {}
    for (const m of parts[i + 1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[m[1]] = m[2].trim()
    if (marker === 'theme light') Object.assign(segments.light, decls)
    else if (marker === 'theme dark') segments.dark.push(decls)
    else Object.assign(segments.derived, decls)
  }
  const [dark, ...otherDark] = segments.dark
  for (const other of otherDark) {
    if (JSON.stringify(other) !== JSON.stringify(dark)) {
      throw new Error('Dark theme blocks in tokens.css differ (explicit vs system preference).')
    }
  }
  const resolve = (map, value) => {
    let v = value
    for (let n = 0; n < 5 && v.startsWith('var('); n++) v = map[v.slice(4, -1).trim()]
    return v
  }
  const finish = (theme) => {
    const all = { ...theme, ...segments.derived }
    return Object.fromEntries(Object.entries(all).map(([k, v]) => [k.slice(2), resolve(all, v)]))
  }
  return { light: finish(segments.light), dark: finish(dark ?? {}) }
}

function channel(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Every pair the app relies on: [label, foreground token, background token, minimum ratio]. */
export function pairs() {
  const list = []
  for (const bg of [...SURFACES, 'code-bg'])
    for (const fg of ['text', 'text-muted', 'text-subtle'])
      list.push([`${fg} on ${bg}`, fg, bg, 4.5])
  for (const bg of SURFACES) {
    list.push([`accent on ${bg}`, 'accent', bg, 4.5])
    list.push([`accent-strong on ${bg}`, 'accent-strong', bg, 4.5])
  }
  list.push(['on-accent on accent', 'on-accent', 'accent', 4.5])
  list.push(['on-accent on accent-strong', 'on-accent', 'accent-strong', 4.5])
  list.push(['code-keyword on code-bg', 'code-keyword', 'code-bg', 4.5])
  list.push(['code-string on code-bg', 'code-string', 'code-bg', 4.5])
  list.push(['code-number on code-bg', 'code-number', 'code-bg', 4.5])
  list.push(['code-comment on code-bg', 'code-comment', 'code-bg', 4.5])
  for (const s of SEVERITIES) list.push([`${s} text on ${s} bg`, `${s}-text`, `${s}-bg`, 4.5])
  for (const s of STAGES)
    for (const bg of ['canvas', 'bg', 'surface-1'])
      list.push([`stage ${s} (text) on ${bg}`, `stage-${s}`, bg, 4.5])
  // Non-text graphics: 3:1.
  for (const s of STAGES) list.push([`stage ${s} (dot) on surface-2`, `stage-${s}`, 'surface-2', 3])
  for (const bg of ['canvas', ...SURFACES]) list.push([`accent (focus ring) on ${bg}`, 'accent', bg, 3])
  for (const r of ['needs', 'recommended', 'clashes', 'alternative', 'pairs'])
    list.push([`relationship ${r} on canvas`, `rel-${r}`, 'canvas', 3])
  return list
}

export function checkContrast(css) {
  const themes = parseTokens(css)
  const results = []
  for (const theme of ['light', 'dark']) {
    for (const [label, fg, bg, min] of pairs()) {
      const f = themes[theme][fg]
      const b = themes[theme][bg]
      if (!f || !b) throw new Error(`Missing token for "${label}" in ${theme} theme`)
      const ratio = contrastRatio(f, b)
      results.push({ theme, label, fg: f, bg: b, ratio, min, pass: ratio >= min })
    }
  }
  return results
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
  const results = checkContrast(css)
  const failures = results.filter((r) => !r.pass)
  for (const r of failures)
    console.log(`FAIL ${r.theme.padEnd(5)} ${r.label}: ${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)} (needs ${r.min})`)
  console.log(`${results.length - failures.length}/${results.length} pairs pass`)
  process.exit(failures.length ? 1 : 0)
}
