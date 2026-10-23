/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { checkContrast, contrastRatio, parseTokens } from '../../scripts/check-contrast.mjs'

const tokensCss = readFileSync('src/styles/tokens.css', 'utf8')
const results = checkContrast(tokensCss)

test('covers both themes', () => {
  expect(new Set(results.map((r) => r.theme))).toEqual(new Set(['light', 'dark']))
  expect(results.length).toBeGreaterThan(100)
})

test.each(results.map((r) => [`${r.theme}: ${r.label}`, r] as const))('%s', (_name, r) => {
  expect(r.ratio, `${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)}, needs ${r.min}`).toBeGreaterThanOrEqual(r.min)
})

test('contrast maths matches known values', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
})

test('both themes define the same tokens', () => {
  const { light, dark } = parseTokens(tokensCss)
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
})
