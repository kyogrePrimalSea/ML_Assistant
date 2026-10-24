// Radial tree camera maths (T039). Pure functions; the positions they work on are the stored layout's.
// A camera maps world to screen as `screen = world * k + (x, y)`. Text never scales below MIN_K, so a
// fan wider than the canvas is reached by panning, and these helpers pick where the camera goes.

export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Cam { k: number; x: number; y: number }
export interface Pad { l: number; r: number; t: number; b: number }
export interface Viewport { w: number; h: number }

/** 15px labels stay at least 12.75px on screen (13.6px for stage names). */
export const MIN_K = 0.85
export const MAX_K = 1.2
/** Room kept clear on each side of the canvas: the corner link at the top, the breadcrumb at the bottom. */
export const PAD: Pad = { l: 28, r: 28, t: 64, b: 60 }
/** When the connection lines show, the whole ring is framed and the floor is lower (see ARCHITECTURE.md). */
export const MIN_K_LINES = 0.25

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const camTransform = (c: Cam) => `translate(${c.x} ${c.y}) scale(${c.k})`
export const sameCam = (a: Cam, b: Cam) => Math.abs(a.k - b.k) < 1e-3 && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

const w = (b: Box) => b.x1 - b.x0
const h = (b: Box) => b.y1 - b.y0

/** Scale that fits `box` in the viewport inside the padding, kept between `min` and MAX_K. */
export function fitScale(box: Box, vp: Viewport, pad: Pad = PAD, min = MIN_K): number {
  const fit = Math.min((vp.w - pad.l - pad.r) / w(box), (vp.h - pad.t - pad.b) / h(box))
  return clamp(fit, min, MAX_K)
}

/** Camera that centres `box` (when it is larger than the viewport at k it is centred anyway). */
export function centreOn(box: Box, k: number, vp: Viewport, pad: Pad = PAD): Cam {
  return {
    k,
    x: pad.l + ((vp.w - pad.l - pad.r) - w(box) * k) / 2 - box.x0 * k,
    y: pad.t + ((vp.h - pad.t - pad.b) - h(box) * k) / 2 - box.y0 * k,
  }
}

/**
 * One axis of framing an opened node: the world start `v` of the view (of length `len`), given the node's
 * own interval N and the children's interval C. Centre on the children's arc; keep every child in view if
 * they fit, and keep the node in view when that costs no child; if the children are wider than the view,
 * keep the node in view and show as many children as fit.
 */
export function frameAxis(n0: number, n1: number, c0: number, c1: number, len: number): number {
  const vc = (c0 + c1) / 2 - len / 2
  const nLo = n1 - len
  const nHi = n0
  if (c1 - c0 <= len) {
    const lo = Math.max(c1 - len, nLo)
    const hi = Math.min(c0, nHi)
    if (lo <= hi) return clamp(vc, lo, hi)
    return clamp((n0 + n1) / 2 - len / 2, c1 - len, c0)
  }
  return clamp(vc, Math.min(nLo, nHi), Math.max(nLo, nHi))
}

/** The camera that frames an opened node and its children at scale k. */
export function frameNode(node: Box, children: Box, k: number, vp: Viewport, pad: Pad = PAD): Cam {
  const lenX = (vp.w - pad.l - pad.r) / k
  const lenY = (vp.h - pad.t - pad.b) / k
  const vx = frameAxis(node.x0, node.x1, children.x0, children.x1, lenX)
  const vy = frameAxis(node.y0, node.y1, children.y0, children.y1, lenY)
  return { k, x: pad.l - vx * k, y: pad.t - vy * k }
}

/** Smallest pan that puts `box` inside the padded viewport; a box larger than the viewport shows its start. */
export function reveal(cam: Cam, box: Box, vp: Viewport, pad: Pad = PAD): Cam {
  const axis = (b0: number, b1: number, off: number, lo: number, hi: number) => {
    const s0 = b0 * cam.k + off
    const s1 = b1 * cam.k + off
    if (s1 - s0 > hi - lo) return off + (lo - s0)
    if (s0 < lo) return off + (lo - s0)
    if (s1 > hi) return off + (hi - s1)
    return off
  }
  return {
    k: cam.k,
    x: axis(box.x0, box.x1, cam.x, pad.l, vp.w - pad.r),
    y: axis(box.y0, box.y1, cam.y, pad.t, vp.h - pad.b),
  }
}

/** Keep part of the world in view: the viewport may not leave `world` (grown by `slack`) behind. */
export function clampPan(cam: Cam, world: Box, vp: Viewport, slack = 40): Cam {
  const axis = (w0: number, w1: number, off: number, size: number) => {
    // The view shows world [ -off/k, (size - off)/k ].
    const a = (slack - w0 * cam.k) // offset where world start sits `slack` inside the near edge... (largest off)
    const b = size - slack - w1 * cam.k // offset where world end sits `slack` inside the far edge
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return clamp(off, lo, hi)
  }
  return { k: cam.k, x: axis(world.x0, world.x1, cam.x, vp.w), y: axis(world.y0, world.y1, cam.y, vp.h) }
}

export type Side = 'left' | 'right' | 'top' | 'bottom'
/** Children of the open node (their boxes) that stick out past each side of the viewport. */
export function offscreen<T extends { box: Box }>(items: T[], cam: Cam, vp: Viewport, inset = 4): Record<Side, T[]> {
  const out: Record<Side, T[]> = { left: [], right: [], top: [], bottom: [] }
  for (const it of items) {
    const x0 = it.box.x0 * cam.k + cam.x
    const x1 = it.box.x1 * cam.k + cam.x
    const y0 = it.box.y0 * cam.k + cam.y
    const y1 = it.box.y1 * cam.k + cam.y
    if (x0 < inset) out.left.push(it)
    if (x1 > vp.w - inset) out.right.push(it)
    if (y0 < inset) out.top.push(it)
    if (y1 > vp.h - inset) out.bottom.push(it)
  }
  return out
}

export const unionBox = (boxes: Box[]): Box => ({
  x0: Math.min(...boxes.map((b) => b.x0)),
  y0: Math.min(...boxes.map((b) => b.y0)),
  x1: Math.max(...boxes.map((b) => b.x1)),
  y1: Math.max(...boxes.map((b) => b.y1)),
})

/**
 * The camera for an open path: scale the stored fit box (never below MIN_K) and centre it; where it is
 * still wider or taller than the canvas, frame the open node and as many children as fit instead.
 */
export function frameTail(tail: Box, node: Box | null, children: Box[], vp: Viewport, pad: Pad = PAD): Cam {
  const k = fitScale(tail, vp, pad)
  const fits = w(tail) * k <= vp.w - pad.l - pad.r + 0.5 && h(tail) * k <= vp.h - pad.t - pad.b + 0.5
  if (!node || children.length === 0 || fits) return centreOn(tail, k, vp, pad)
  return frameNode(node, unionBox(children), k, vp, pad)
}
