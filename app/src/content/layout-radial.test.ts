// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FAN_STEP, METRICS, SECTOR_MAX, computeLayout, fanSector, labelBoxes, nodeRects, overlaps, segmentHitsRect, segmentsCross, wrapText,
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

const HUB: Rect = { x0: -100, y0: -62, x1: 100, y1: 112 }
const HUB_DOT: Rect = { x0: -44, y0: -44, x1: 44, y1: 44 }
/** Canvas sizes at 1440 and 1024 wide (text must stay at least 13px, so k at least 0.85) and the camera padding. */
const CANVAS = { 1024: { w: 620, h: 700 }, 1440: { w: 880, h: 836 } }
const PAD = { x: 56, y: 148 }
const kFor = (b: Rect, c: { w: number; h: number }) => Math.min(1.2, (c.w - PAD.x) / (b.x1 - b.x0), (c.h - PAD.y) / (b.y1 - b.y0))
const signedGap = (a: number, b: number) => ((a - b + 540) % 360) - 180
const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('layout file', () => {
  it('is deterministic and the committed copy is current', () => {
    expect(computeLayout(index)).toEqual(layout)
    expect(JSON.parse(JSON.stringify(layout))).toEqual(stored)
  }, 60_000) // the full layout takes several seconds on CI runners

  it('is version 2 with one layout per goal', () => {
    expect(stored.version).toBe(2)
    expect(Object.keys(stored.goals).sort()).toEqual(index.taxonomy.goals.map((g) => g.id).sort())
    expect(Object.keys(stored.goals)).toHaveLength(3)
  })
})

describe('label estimates', () => {
  it('the nominal sector grows with the child count and is capped', () => {
    const w = [1, 2, 3, 4, 5, 6, 7].map(fanSector)
    expect(w[0]).toBe(0)
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeGreaterThan(w[i - 1])
    expect(Math.max(...w)).toBeLessThanOrEqual(SECTOR_MAX)
  })

  it('wraps on words, never splitting or rewording', () => {
    expect(wrapText('Fit a line, but the data is awkward', 24)).toEqual(['Fit a line, but the data', 'is awkward'])
    expect(wrapText('Supercalifragilistic', 5)).toEqual(['Supercalifragilistic'])
    expect(wrapText('', 5)).toEqual([''])
  })

  it('a page in Questions mode is taller than in Names mode (name plus pick_when)', () => {
    const b = labelBoxes({ id: 'p', level: 'page', shown_as: 'XGBoost', pick_when: 'Top accuracy on tabular data', children: [] })
    expect(b.questions.h).toBeGreaterThan(b.names.h)
  })

  it('every question_label (at most 40 characters) wraps to three lines or fewer', () => {
    for (const g of index.taxonomy.goals) {
      const walk = (n: ViewNode) => {
        if (n.level !== 'page' && n.question_label) {
          expect(wrapText(n.question_label, METRICS[n.level === 'stage' ? 'stage' : 'node'].wrap).length).toBeLessThanOrEqual(3)
        }
        n.children.forEach(walk)
      }
      view(g.id).forEach(walk)
    }
  })
})

describe.each(index.taxonomy.goals.map((g) => g.id))('goal %s', (goal) => {
  const gl = layout.goals[goal]
  const paths = openPaths(goal)
  const placed = new Map<string, LayoutNode>([...gl.ring, ...Object.values(gl.fans).flatMap((f) => f.children)].map((n) => [n.id, n]))
  const shownFor = (path: ViewNode[]): LayoutNode[] => [...gl.ring, ...path.flatMap((p) => gl.fans[p.id].children)]

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

  it('closed ring: no overlaps and the centre is clear', () => {
    expectNoOverlap(gl.ring, 'ring')
  })

  it('every open path: children on one arc beyond the node, in a sector around its angle, at most 7', () => {
    for (const { id, path } of paths) {
      const node = path[path.length - 1]
      const fan = gl.fans[id]
      const parent = placed.get(id)!
      expect(fan.children.map((c) => c.id)).toEqual(node.children.map((c) => c.id))
      expect(node.children.length).toBeLessThanOrEqual(7)
      expect(fan.sector).toBeLessThanOrEqual(SECTOR_MAX)
      expect(fan.sector).toBeGreaterThanOrEqual(0)
      if (node.children.length === 1) expect(fan.sector).toBe(0)
      expect(fan.radius, `${id}: arc beyond the node`).toBeGreaterThanOrEqual(parent.radius + FAN_STEP - 0.1)
      // siblings share a radius (or the two stagger radii, one box height apart)
      const radii = [...new Set(fan.children.map((c) => c.radius))]
      expect(radii.length, `${id}: radii ${radii}`).toBeLessThanOrEqual(fan.stagger ? 2 : 1)
      if (radii.length === 2) expect(Math.abs(radii[1] - radii[0])).toBeLessThanOrEqual(Math.max(...fan.children.map((c) => c.h)) + 0.5)
      for (const c of fan.children) {
        expect(c.radius).toBeGreaterThanOrEqual(fan.radius - 0.1)
        expect(angleGap(c.angle, parent.angle), `${id} > ${c.id} sector`).toBeLessThanOrEqual(fan.sector / 2 + EPS)
        expect(Math.hypot(c.x, c.y)).toBeCloseTo(c.radius, 0)
      }
      // A fan, not a comb: evenly spread, centred on the parent's own angle, in reading order
      // (clockwise on the right half and the top, counter-clockwise elsewhere).
      const offsets = fan.children.map((c) => signedGap(c.angle, parent.angle))
      const cw = Math.cos((parent.angle * Math.PI) / 180) > 1e-9 || (Math.abs(Math.cos((parent.angle * Math.PI) / 180)) <= 1e-9 && parent.angle < 0)
      for (let i = 1; i < offsets.length; i++) expect(cw ? offsets[i] > offsets[i - 1] : offsets[i] < offsets[i - 1]).toBe(true)
      expect(offsets.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 0)
    }
  })

  it('every open path: no label overlaps (stored boxes cover both label sets), the other stages stay visible', () => {
    for (const { id, path } of paths) {
      const shown = shownFor(path)
      expect(shown.filter((n) => n.level === 'stage')).toHaveLength(9)
      expectNoOverlap(shown, id)
    }
  })

  it('every open path: no link crosses another link or passes through a label other than its own ends', () => {
    for (const { id, path } of paths) {
      const shown = shownFor(path)
      const links = path.flatMap((p) => gl.fans[p.id].children.map((c) => ({ from: placed.get(p.id)!, to: c })))
      for (let i = 0; i < links.length; i++) {
        const a = links[i]
        for (let j = i + 1; j < links.length; j++) {
          const b = links[j]
          expect(segmentsCross(a.from, a.to, b.from, b.to), `${id}: ${a.from.id}-${a.to.id} crosses ${b.from.id}-${b.to.id}`).toBe(false)
        }
        for (const n of shown) {
          if (n.id === a.from.id || n.id === a.to.id) continue
          for (const r of nodeRects(n)) expect(segmentHitsRect(a.from, a.to, r), `${id}: ${a.from.id}-${a.to.id} passes through ${n.id}`).toBe(false)
        }
        expect(segmentHitsRect(a.from, a.to, HUB), `${id}: link into the centre`).toBe(false)
      }
    }
  })

  it('every open path: the fit box frames the tail (stage, parent, open node, children) and reports its scale', () => {
    let min1024 = Infinity
    let min1440 = Infinity
    for (const { id, path } of paths) {
      const fit = gl.fits[id]
      const node = placed.get(id)!
      const parent = path.length > 1 ? placed.get(path[path.length - 2].id)! : null
      const tail: Rect[] = [
        ...nodeRects(gl.ring.find((r) => r.id === path[0].id)!),
        ...nodeRects(node),
        ...gl.fans[id].children.flatMap(nodeRects),
        ...(parent ? nodeRects(parent) : [HUB_DOT]),
      ]
      for (const r of tail) {
        expect(r.x0).toBeGreaterThanOrEqual(fit.x0 - EPS)
        expect(r.y0).toBeGreaterThanOrEqual(fit.y0 - EPS)
        expect(r.x1).toBeLessThanOrEqual(fit.x1 + EPS)
        expect(r.y1).toBeLessThanOrEqual(fit.y1 + EPS)
      }
      min1024 = Math.min(min1024, kFor(fit, CANVAS[1024]))
      min1440 = Math.min(min1440, kFor(fit, CANVAS[1440]))
    }
    // The closed ring shows every stage.
    for (const r of [HUB, ...gl.ring.flatMap(nodeRects)]) {
      expect(r.x0).toBeGreaterThanOrEqual(gl.fits.root.x0 - EPS)
      expect(r.x1).toBeLessThanOrEqual(gl.fits.root.x1 + EPS)
      expect(r.y0).toBeGreaterThanOrEqual(gl.fits.root.y0 - EPS)
      expect(r.y1).toBeLessThanOrEqual(gl.fits.root.y1 + EPS)
    }
    // Regression floors (the scales reached today; docs/ARCHITECTURE.md lists them).
    expect(min1024).toBeGreaterThanOrEqual(0.4)
    expect(min1440).toBeGreaterThanOrEqual(0.6)
    expect(kFor(gl.fits.root, CANVAS[1024])).toBeGreaterThanOrEqual(0.82)
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
 * Boxes at the stored positions (each at least as large as the estimate for Names and for Questions,
 * checked in "stored boxes cover the larger label set"): no two nodes' dots or labels overlap, and
 * nothing touches the centre.
 */
function expectNoOverlap(nodes: LayoutNode[], where: string) {
  const items = nodes.map((n) => ({ n, rects: nodeRects(n) }))
  for (const a of items) for (const r of a.rects) expect(overlaps(r, HUB), `${where}: ${a.n.id} over the centre`).toBe(false)
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const ra of items[i].rects) {
        for (const rb of items[j].rects) {
          if (overlaps(ra, rb)) throw new Error(`${where}: ${items[i].n.id} overlaps ${items[j].n.id}`)
        }
      }
    }
  }
}
