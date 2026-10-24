// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  METRICS, SECTOR_MAX, computeLayout, fanSector, labelBoxes, nodeRects, overlaps, wrapText,
  type LayoutNode, type Rect, type ViewNode,
} from '../../scripts/layout-radial.mjs'
import type { ContentIndex } from './types'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const index = JSON.parse(readFileSync(join(appDir, 'public', 'data', 'index.json'), 'utf8')) as ContentIndex
const stored = JSON.parse(readFileSync(join(appDir, '..', 'content', 'derived', 'layout-radial.json'), 'utf8'))
const layout = computeLayout(index)
const STAGE_IDS = index.vocab.stages.map((s) => s.id)
const EPS = 0.25

const view = (goal: string) => index.taxonomy.views[goal] as unknown as ViewNode[]

/** Every non-page node with children, with the chain of opened nodes from its stage down to it. */
function openPaths(goal: string) {
  const out: { id: string; path: ViewNode[] }[] = []
  const walk = (n: ViewNode, above: ViewNode[]) => {
    if (n.level === 'page' || n.children.length === 0) return
    out.push({ id: n.id, path: [...above, n] })
    for (const c of n.children) walk(c, [...above, n])
  }
  for (const s of view(goal)) walk(s, [])
  return out
}

const HUB: Rect = { x0: -140, y0: -62, x1: 140, y1: 112 }
const signedGap = (a: number, b: number) => ((a - b + 540) % 360) - 180
const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('layout file', () => {
  it('is deterministic and the committed copy is current', () => {
    expect(computeLayout(index)).toEqual(layout)
    expect(JSON.parse(JSON.stringify(layout))).toEqual(stored)
  })

  it('is version 2 with one layout per goal', () => {
    expect(stored.version).toBe(2)
    expect(Object.keys(stored.goals).sort()).toEqual(index.taxonomy.goals.map((g) => g.id).sort())
    expect(Object.keys(stored.goals)).toHaveLength(3)
  })
})

describe('label estimates', () => {
  it('wraps on words, never splitting or rewording', () => {
    expect(wrapText('Fit a line, but the data is awkward', 24)).toEqual(['Fit a line, but the data', 'is awkward'])
    expect(wrapText('Supercalifragilistic', 5)).toEqual(['Supercalifragilistic'])
    expect(wrapText('', 5)).toEqual([''])
  })

  it('a page in Questions mode is taller than in Names mode (name plus pick_when)', () => {
    const b = labelBoxes({ id: 'p', level: 'page', shown_as: 'XGBoost', pick_when: 'Top accuracy on tabular data', children: [] })
    expect(b.questions.h).toBeGreaterThan(b.names.h)
  })

  it('every question_label (at most 40 characters) fits its box in two lines or fewer', () => {
    for (const g of index.taxonomy.goals) {
      const walk = (n: ViewNode) => {
        if (n.level !== 'page' && n.question_label) {
          expect(wrapText(n.question_label, METRICS[n.level === 'stage' ? 'stage' : 'node'].wrap).length).toBeLessThanOrEqual(2)
        }
        n.children.forEach(walk)
      }
      view(g.id).forEach(walk)
    }
  })
})

describe.each(index.taxonomy.goals.map((g) => g.id))('goal %s', (goal) => {
  const gl = layout.goals[goal]
  const nodeById = new Map<string, ViewNode>()
  const index_ = (n: ViewNode) => { nodeById.set(n.id, n); n.children.forEach(index_) }
  view(goal).forEach(index_)
  const paths = openPaths(goal)
  const placed = new Map<string, LayoutNode>([...gl.ring, ...Object.values(gl.fans).flatMap((f) => f.children)].map((n) => [n.id, n]))

  it('has the nine stages at fixed ring angles, in pipeline order', () => {
    expect(gl.ring.map((n) => n.id)).toEqual(STAGE_IDS)
    expect(gl.ring.map((n) => n.angle)).toEqual(STAGE_IDS.map((_, i) => -90 + 40 * i))
    expect(gl.ring[0].angle).toBe(-90)
    for (const n of gl.ring) expect(n.radius).toBe(layout.ring)
    const empty = gl.ring.filter((n) => n.empty).map((n) => n.id)
    expect(empty).toEqual(view(goal).filter((s) => s.children.length === 0).map((s) => s.id))
  })

  it(`checks ${paths.length} open paths (every stage, group and family that has children)`, () => {
    expect(paths.length).toBeGreaterThan(40)
    expect(Object.keys(gl.fans).sort()).toEqual(paths.map((p) => p.id).sort())
  })

  it('closed ring: no overlaps for either label set, and the centre is clear', () => {
    expectNoOverlap(gl.ring, view(goal), nodeById, true)
  })

  it('every open path: outward, inside the sector, at most 7 children', () => {
    for (const { id, path } of paths) {
      const node = path[path.length - 1]
      const fan = gl.fans[id]
      const parent = placed.get(id)!
      expect(fan.children.map((c) => c.id)).toEqual(node.children.map((c) => c.id))
      expect(node.children.length).toBeLessThanOrEqual(7)
      expect(fan.sector).toBe(fanSector(node.children.length))
      expect(fan.sector).toBeLessThanOrEqual(SECTOR_MAX)
      for (const c of fan.children) {
        expect(c.radius, `${id} > ${c.id} outward`).toBeGreaterThan(parent.radius + 20)
        expect(angleGap(c.angle, parent.angle), `${id} > ${c.id} sector`).toBeLessThanOrEqual(fan.sector / 2 + EPS)
        expect(Math.hypot(c.x, c.y)).toBeCloseTo(c.radius, 0)
      }
      // A fan, not a comb: the children are spread evenly and centred on the parent's own angle,
      // in reading order (clockwise on the right half and the top, counter-clockwise elsewhere).
      const offsets = fan.children.map((c) => signedGap(c.angle, parent.angle))
      const cw = Math.cos((parent.angle * Math.PI) / 180) > 1e-9 || Math.abs(Math.cos((parent.angle * Math.PI) / 180)) <= 1e-9 && parent.angle < 0
      for (let i = 1; i < offsets.length; i++) expect(cw ? offsets[i] > offsets[i - 1] : offsets[i] < offsets[i - 1]).toBe(true)
      expect(offsets.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 0)
    }
  })

  it('every open path: no label overlaps (both label sets), the other stages stay visible', () => {
    for (const { id, path } of paths) {
      const shown: LayoutNode[] = [...gl.ring, ...path.flatMap((p) => gl.fans[p.id].children)]
      expect(shown.filter((n) => n.level === 'stage')).toHaveLength(9)
      expectNoOverlap(shown, view(goal), nodeById, false, id)
    }
  })

  it('every open path: the stored fit box holds the ring and the whole opened path', () => {
    for (const { id, path } of paths) {
      const fit = gl.fits[id]
      const shown: LayoutNode[] = [...gl.ring, ...path.flatMap((p) => gl.fans[p.id].children)]
      for (const r of [HUB, ...shown.flatMap(nodeRects)]) {
        expect(r.x0).toBeGreaterThanOrEqual(fit.x0 - EPS)
        expect(r.y0).toBeGreaterThanOrEqual(fit.y0 - EPS)
        expect(r.x1).toBeLessThanOrEqual(fit.x1 + EPS)
        expect(r.y1).toBeLessThanOrEqual(fit.y1 + EPS)
      }
    }
    expect(gl.fits.root).toBeDefined()
  })
})

describe('across goals', () => {
  it('the nine stages sit at the same angle and radius in every goal', () => {
    const goals = Object.values(layout.goals)
    for (const g of goals) {
      expect(g.ring.map((n) => [n.id, n.angle, n.radius, n.x, n.y])).toEqual(goals[0].ring.map((n) => [n.id, n.angle, n.radius, n.x, n.y]))
    }
  })

  it('a stage with no pages for the goal is flagged empty (forecast has nothing to interpret)', () => {
    expect(layout.goals.forecast.ring.find((n) => n.id === 'interpret')!.empty).toBe(true)
    expect(layout.goals['predict-number'].ring.some((n) => n.empty)).toBe(false)
  })

  it('stored boxes cover the larger label set, so Names and Questions share one layout', () => {
    for (const goal of Object.keys(layout.goals)) {
      const walk = (n: ViewNode, ln: LayoutNode, empty: boolean) => {
        const b = labelBoxes(n, empty)
        expect(ln.w).toBeGreaterThanOrEqual(Math.max(b.names.w, b.questions.w) - 0.1)
        expect(ln.h).toBeGreaterThanOrEqual(Math.max(b.names.h, b.questions.h) - 0.1)
      }
      view(goal).forEach((s, i) => walk(s, layout.goals[goal].ring[i], s.children.length === 0))
      for (const [id, fan] of Object.entries(layout.goals[goal].fans)) {
        const parent = findNode(view(goal), id)!
        parent.children.forEach((c, i) => walk(c, fan.children[i], false))
      }
    }
  })
})

function findNode(nodes: ViewNode[], id: string): ViewNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const r = findNode(n.children, id)
    if (r) return r
  }
}

/**
 * Re-estimate each node's label box from its text for Names and for Questions (not from the stored
 * box), put it at the stored position and anchor, and require that no two nodes' dots or labels
 * overlap and nothing touches the centre.
 */
function expectNoOverlap(nodes: LayoutNode[], v: ViewNode[], byId: Map<string, ViewNode>, ring: boolean, where = 'ring') {
  void v
  for (const set of ['names', 'questions'] as const) {
    const items = nodes.map((n) => {
      const text = byId.get(n.id)!
      const b = labelBoxes(text, n.empty === true)[set]
      return { n, rects: nodeRects({ ...n, w: b.w, h: b.h }) }
    })
    for (const a of items) {
      for (const r of a.rects) expect(overlaps(r, HUB), `${where} ${set}: ${a.n.id} over the centre`).toBe(false)
    }
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        for (const ra of items[i].rects) {
          for (const rb of items[j].rects) {
            if (overlaps(ra, rb)) throw new Error(`${where} ${set}: ${items[i].n.id} overlaps ${items[j].n.id}`)
          }
        }
      }
    }
  }
  if (ring) expect(nodes).toHaveLength(9)
}
