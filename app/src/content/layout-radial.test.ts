// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { computeLayout } from '../../scripts/layout-radial.mjs'
import type { ContentIndex } from './types'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const small = {
  pages: [
    { id: 'b', plain_name: 'B', family: 'Z fam', stage: 'model', tracks: ['standard', 'time-series'] },
    { id: 'a', plain_name: 'A', family: 'Z fam', stage: 'model', tracks: ['standard'] },
    { id: 'c', plain_name: 'C', family: 'A fam', stage: 'clean', tracks: ['standard'] },
  ],
  vocab: { stages: [{ id: 'clean' }, { id: 'model' }], tracks: [{ id: 'standard' }, { id: 'time-series' }] },
}

describe('layout-radial', () => {
  it('is deterministic and independent of input order', () => {
    const a = computeLayout(small)
    const b = computeLayout({ ...small, pages: [...small.pages].reverse() })
    expect(b).toEqual(a)
    expect(computeLayout(small)).toEqual(a)
  })

  it('orders stages by pipeline, families and items alphabetically', () => {
    const l = computeLayout(small).tracks.standard
    expect(l.map((s) => s.id)).toEqual(['clean', 'model'])
    expect(l[1].families[0].items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(l[0].angle).toBe(-90)
  })

  it('places every page once per track it belongs to', () => {
    const l = computeLayout(small)
    const ids = (t: string) => l.tracks[t].flatMap((s) => s.families.flatMap((f) => f.items.map((i) => i.id))).sort()
    expect(ids('standard')).toEqual(['a', 'b', 'c'])
    expect(ids('time-series')).toEqual(['b'])
  })

  it('the real index: every page placed exactly once per track, no overlaps in a column', () => {
    const index = JSON.parse(readFileSync(join(appDir, 'public', 'data', 'index.json'), 'utf8')) as ContentIndex
    const l = computeLayout(index)
    for (const t of index.vocab.tracks) {
      const placed = l.tracks[t.id].flatMap((s) => s.families.flatMap((f) => f.items.map((i) => i.id)))
      expect(placed.sort()).toEqual(index.pages.filter((p) => p.tracks.includes(t.id)).map((p) => p.id).sort())
      for (const s of l.tracks[t.id]) {
        const ys = s.families.map((f) => f.y)
        expect(new Set(ys).size).toBe(ys.length)
        for (const f of s.families) {
          const iy = f.items.map((i) => i.y)
          expect(Math.min(...iy.slice(1).map((y, k) => y - iy[k]), 99)).toBeGreaterThanOrEqual(35.9)
        }
      }
    }
  })
})
