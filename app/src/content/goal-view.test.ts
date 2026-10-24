// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { goalView, nodeText, pagePlacement } from '../../scripts/goal-view.mjs'
import type { ContentIndex } from './types'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const tax = load(readFileSync(join(root, 'content', 'taxonomy.yaml'), 'utf8')) as { goals: { id: string }[]; stages: unknown[] }
// Exported from tools/taxonomy.py goal_view by tools/export_goal_views.py.
const python = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'taxonomy', 'goal-views.json'), 'utf8'))
const index = JSON.parse(readFileSync(join(root, 'app', 'public', 'data', 'index.json'), 'utf8')) as ContentIndex

describe('goal views, JS against the Python reference', () => {
  it.each(tax.goals.map((g) => g.id))('%s: same tree, ids, levels and resolved texts', (goal) => {
    expect(goalView(tax, goal)).toEqual(python[goal])
  })

  it('covers all three goals', () => {
    expect(Object.keys(python)).toEqual(['predict-number', 'predict-category', 'forecast'])
  })

  it('index.json carries the same node ids per goal', () => {
    const ids = (nodes: { id: string; children: unknown[] }[]): string[] =>
      nodes.flatMap((n) => [n.id, ...ids(n.children as { id: string; children: unknown[] }[])])
    for (const goal of Object.keys(python)) {
      expect(ids(index.taxonomy.views[goal])).toEqual(ids(python[goal]))
    }
  })

  it('every page is placed once, and the index stage and family come from the taxonomy', () => {
    const placement = pagePlacement(tax)
    for (const p of index.pages) {
      expect(placement.get(p.id), p.id).toMatchObject({ stage: p.stage, family: p.family })
    }
  })

  it('node_text picks the goal entry, or null', () => {
    expect(nodeText('x', 'g')).toBe('x')
    expect(nodeText({ g: 'y' }, 'g')).toBe('y')
    expect(nodeText({ h: 'y' }, 'g')).toBeNull()
    expect(nodeText(null, 'g')).toBeNull()
  })
})
