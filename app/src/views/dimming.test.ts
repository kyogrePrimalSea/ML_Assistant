import { readFileSync } from 'node:fs'
import { contrastRatio, parseTokens } from '../../scripts/check-contrast.mjs'

const STAGES = ['explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret']
const themes = parseTokens(readFileSync('src/styles/tokens.css', 'utf8'))
const css = readFileSync('src/views/radial-tree.css', 'utf8')
const alpha = Number(/\.rt-node\[data-dim\] \.rt-disc \{ stroke-opacity: ([\d.]+)/.exec(css)![1])
const iconAlpha = Number(/\.rt-node\[data-dim\] \.rt-icon \{ opacity: ([\d.]+)/.exec(css)![1])

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
const blend = (fg: string, bg: string, a: number) => {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map((i) => hex(a * c(fg, i) + (1 - a) * c(bg, i))).join('')
}

test('dimmed stage rings and icons keep 3:1 against the canvas, and their muted labels 4.5:1', () => {
  expect(iconAlpha).toBe(alpha)
  for (const theme of ['light', 'dark'] as const) {
    const t = themes[theme]
    expect(contrastRatio(t['text-muted'], t.canvas)).toBeGreaterThanOrEqual(4.5)
    for (const s of STAGES) expect(contrastRatio(blend(t[`stage-${s}`], t.canvas, alpha), t.canvas), `${theme} ${s}`).toBeGreaterThanOrEqual(3)
  }
})
