import { readFileSync } from 'node:fs'
import type { ContentIndex, RelationshipType } from '@/content/types'
import { connectionsOf, resolveLines, type LineNode } from './RelationshipLines'

const index: ContentIndex = JSON.parse(readFileSync('public/data/index.json', 'utf8'))
const pageById = new Map(index.pages.map((p) => [p.id, p]))
const node = (x: number): LineNode => ({ x, y: 0, side: 1 })

describe('relationship lines', () => {
  it('XGBoost has all five connection types (either direction); Alternative to comes from its taxonomy family', () => {
    const types = new Set(connectionsOf(index.relationships, 'xgboost').map((c) => c.type))
    expect([...types].sort()).toEqual(['alternative_to', 'clashes', 'needs', 'pairs_with', 'recommended'])
    expect(connectionsOf(index.relationships, 'xgboost').find((c) => c.type === 'pairs_with')?.other).toBe('treeexplainer')
  })

  it('draws only the toggled types; collapsed targets end at their stage and share one line', () => {
    const nodes = new Map<string, LineNode>([
      ['i:xgboost', node(-800)],
      ['f:model/model.trees.boosting', node(-380)],
      ['s:model', node(-200)],
      ['s:transform', node(100)],
      ['s:clean', node(200)],
    ])
    const on = new Set<RelationshipType>(['needs', 'clashes'])
    const lines = resolveLines(index.relationships, 'xgboost', on, pageById, nodes)
    expect(new Set(lines.map((l) => l.type))).toEqual(on)
    const needs = lines.filter((l) => l.type === 'needs')
    expect(needs).toHaveLength(1)
    expect(needs[0].to.key).toBe('s:transform')
    expect(needs[0].hidden).toBe(true)
    expect(needs[0].names).toHaveLength(3)
    expect(resolveLines(index.relationships, 'xgboost', new Set(), pageById, nodes)).toEqual([])
  })
})
