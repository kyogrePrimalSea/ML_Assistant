import { writeFileSync } from 'node:fs'
import { boundsOf, nodeRects } from '../../scripts/layout-radial-core.mjs'
import type { TaxNode } from '@/content/types'
import { realIndex, realLayout } from '@/test-data'
import { MIN_K, PAD, centreOn, clampPan, frameAxis, frameTail, offscreen, reveal, type Box } from './camera'

type LNode = Parameters<typeof nodeRects>[0] & { id: string }
type GoalLayout = { ring: LNode[]; fans: Record<string, { children: LNode[] }>; fits: Record<string, Box> }
const boxOf = (n: Parameters<typeof nodeRects>[0]): Box => boundsOf(nodeRects(n))
const VIEWPORTS = [
  { name: '1440 wide, no panel', w: 1440, h: 836 },
  { name: '1440 wide, panel open', w: 880, h: 836 },
  { name: '1024 wide, no panel', w: 1024, h: 704 },
  { name: '1024 wide, panel open', w: 604, h: 704 },
]

test('frameAxis centres on the children, keeps the node in view, and shows what fits when children are wider', () => {
  // Children fit, node beside them: all of both in view.
  expect(frameAxis(0, 40, 100, 300, 400)).toBeCloseTo(0, 5) // centring would cut the node, so the view starts at it
  // Children fit and the node is inside their span: centred on the children.
  expect(frameAxis(180, 220, 100, 300, 400)).toBeCloseTo(0, 5)
  // Children wider than the view: the node stays in view.
  const v = frameAxis(0, 40, 100, 900, 400)
  expect(v).toBeLessThanOrEqual(0)
  expect(v + 400).toBeGreaterThanOrEqual(40)
})

test('reveal pans the least that puts a box inside the padded canvas', () => {
  const vp = { w: 800, h: 600 }
  const cam = { k: 1, x: 0, y: 0 }
  expect(reveal(cam, { x0: 100, y0: 100, x1: 200, y1: 150 }, vp)).toEqual(cam)
  const r = reveal(cam, { x0: 760, y0: 100, x1: 900, y1: 150 }, vp)
  expect(r.x).toBeCloseTo(vp.w - PAD.r - 900)
  expect(r.y).toBe(0)
  const l = reveal(cam, { x0: -50, y0: 100, x1: 20, y1: 150 }, vp)
  expect(l.x).toBeCloseTo(PAD.l + 50)
})

test('clampPan keeps part of the world in view', () => {
  const vp = { w: 800, h: 600 }
  const c = clampPan({ k: 1, x: 5000, y: -5000 }, { x0: -300, y0: -300, x1: 300, y1: 300 }, vp)
  expect(c.x).toBeLessThan(800)
  expect(c.y).toBeGreaterThan(-600)
})

test('offscreen lists children cut by each side', () => {
  const vp = { w: 400, h: 300 }
  const items = [{ box: { x0: -20, y0: 100, x1: 60, y1: 140 } }, { box: { x0: 350, y0: 100, x1: 450, y1: 140 } }, { box: { x0: 100, y0: 100, x1: 200, y1: 140 } }]
  const o = offscreen(items, { k: 1, x: 0, y: 0 }, vp)
  expect(o.left).toHaveLength(1)
  expect(o.right).toHaveLength(1)
  expect(o.top).toHaveLength(0)
})

test('every open path: text never scales below 0.85, the open node stays in view, and the report lists fans wider than the canvas', () => {
  const lines: string[] = []
  const hidden: Record<string, string[]> = {}
  for (const [goalId, gl] of Object.entries(realLayout.goals as Record<string, GoalLayout>)) {
    const view = realIndex.taxonomy.views[goalId]
    const names = new Map<string, string>()
    const walk = (n: TaxNode, trail: string[]) => {
      const t = [...trail, n.question_label ?? n.names_label ?? n.id]
      names.set(n.id, t.join(' > '))
      n.children.forEach((c) => walk(c, t))
    }
    view.forEach((s) => walk(s, []))
    for (const vp of VIEWPORTS) {
      let total = 0
      for (const [id, fan] of Object.entries(gl.fans)) {
        const node = [...gl.ring, ...Object.values(gl.fans).flatMap((f) => f.children)].find((n) => n.id === id)!
        const cam = frameTail(gl.fits[id], boxOf(node), fan.children.map(boxOf), vp)
        expect(cam.k).toBeGreaterThanOrEqual(MIN_K - 1e-9)
        expect(cam.k).toBeLessThanOrEqual(1.2 + 1e-9)
        // The open node (its dot and label) is inside the canvas.
        const nb = boxOf(node)
        expect(nb.x0 * cam.k + cam.x).toBeGreaterThanOrEqual(-1)
        expect(nb.x1 * cam.k + cam.x).toBeLessThanOrEqual(vp.w + 1)
        const off = offscreen(fan.children.map((n) => ({ box: boxOf(n) })), cam, vp, 0)
        const cut = new Set([...off.left, ...off.right, ...off.top, ...off.bottom]).size
        total++
        if (cut > 0) (hidden[vp.name] ??= []).push(`${goalId}: ${names.get(id)} (${cut} of ${fan.children.length})`)
      }
      lines.push(`${goalId} @ ${vp.name}: ${(hidden[vp.name] ?? []).filter((s) => s.startsWith(goalId + ':')).length} of ${total} fans have children out of view`)
    }
    const root = centreOn(gl.fits.root, MIN_K, VIEWPORTS[3])
    expect(root.k).toBe(MIN_K)
  }
  if (process.env.REPORT) {
    writeFileSync(process.env.REPORT, [lines.join('\n'), ...Object.entries(hidden).map(([vp, list]) => `\n== ${vp}\n${list.join('\n')}`)].join('\n'))
  }
})
