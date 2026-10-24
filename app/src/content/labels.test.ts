// @vitest-environment node
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { familyNames, nodeName } from './labels'
import type { ContentIndex, PageData } from './types'

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as ContentIndex

describe('nodeName', () => {
  it('gives names_label in Names mode and question_label in Questions mode', () => {
    expect(nodeName(index, 'transform.encode.features')).toBe('Categorical encoders')
    expect(nodeName(index, 'transform.encode.features', 'questions')).toBe('Encode the input columns')
    expect(nodeName(index, 'transform')).toBe('Transform')
  })

  it('reads a per-goal question_label, falling back to any entry', () => {
    const [id, l] = Object.entries(index.taxonomy.labels).find(([, v]) => typeof v.question_label === 'object')!
    const map = l.question_label as Record<string, string | null>
    const goal = Object.keys(map).find((g) => map[g])!
    expect(nodeName(index, id, 'questions', goal)).toBe(map[goal])
    expect(typeof nodeName(index, id, 'questions')).toBe('string')
  })

  it('returns an unknown id unchanged, and copes with no index', () => {
    expect(nodeName(index, 'nope')).toBe('nope')
    expect(nodeName(null, 'transform')).toBe('transform')
    expect(familyNames(undefined)).toEqual({})
  })

  it('names every family or group step of every content record, so no raw id is ever shown', () => {
    const names = familyNames(index)
    let steps = 0
    for (const f of readdirSync('public/data/pages')) {
      const rec = (JSON.parse(readFileSync(`public/data/pages/${f}`, 'utf8')) as PageData).record
      for (const e of rec.slots.prep) {
        if (!('family' in e.step)) continue
        steps++
        expect(names[e.step.family], `${rec.id}: ${e.step.family}`).toBeTruthy()
        expect(names[e.step.family]).not.toMatch(/^[a-z]+\.[a-z]/)
      }
    }
    expect(steps).toBeGreaterThan(0)
  })

  it('names every page family in the index', () => {
    const names = familyNames(index)
    for (const p of index.pages) expect(names[p.family], `${p.id}: ${p.family}`).toBeTruthy()
  })
})
