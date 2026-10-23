import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import { buildCells, toIpynb } from './notebook.ts'
import { shapesAlong, formatShape } from './shape.ts'
import { DEMO_PROFILE } from './demoPipeline.ts'

const picks = () => [rec('r2-score', 'evaluate', 'Regression metrics'), rec('train-test-split', 'split', 'Splitters'), rec('onehotencoder', 'transform', 'Categorical encoding')]

describe('notebook', () => {
  it('is byte-identical for the same picks, whatever order they were picked in', () => {
    const a = toIpynb(buildCells(DEMO_PROFILE, picks()))
    const b = toIpynb(buildCells(DEMO_PROFILE, picks().reverse()))
    expect(a).toBe(b)
  })
  it('has a title, a setup cell and one cell per stop in stage order', () => {
    const cells = buildCells(DEMO_PROFILE, picks())
    expect(cells.map((c) => c.label)).toEqual([
      'Title', 'Setup', 'Stop 1: onehotencoder', 'Stop 2: train-test-split', 'Stop 3: r2-score',
    ])
    expect(cells[1].source).toContain('TODO_path_to_data.csv')
  })
  it('writes nbformat 4 JSON', () => {
    const nb = JSON.parse(toIpynb(buildCells(DEMO_PROFILE, picks())))
    expect(nb.nbformat).toBe(4)
    expect(nb.cells[0].cell_type).toBe('markdown')
    expect(nb.cells[2].source.join('')).toContain('ColumnTransformer')
  })
  it('gives pages without a template a TODO cell', () => {
    const cells = buildCells(DEMO_PROFILE, [rec('mystery', 'select', 'x')])
    expect(cells[2].source).toContain('TODO: no fixed template')
  })
})

describe('shapesAlong', () => {
  it('follows shape_effect and overrides, and reports words when unknown', () => {
    const enc = rec('e', 'transform', 'x', { rules: { shape_effect: { rows: 'same', columns: 'expands' } } })
    const split = rec('s', 'split', 'x', { rules: { shape_effect: { rows: 'shrinks', columns: 'same' } } })
    const out = shapesAlong({ rows: 1460, columns: 81 }, [enc, split], { e: { columns: 262 } })
    expect(formatShape(out[0].before)).toBe('1,460 × 81')
    expect(formatShape(out[0].after)).toBe('1,460 × 262')
    expect(formatShape(out[1].after)).toBe('fewer × 262')
  })
})
