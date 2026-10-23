/**
 * Camera maths for the radial tree. A point is a world position plus how far its
 * drawn node and label reach on each side in screen pixels (nodes and labels keep a
 * fixed screen size while the world scales). The camera is the largest scale at which
 * every reach fits the viewport, centred. Horizontal and vertical scales are fitted
 * separately for an opened branch (circles stay circles; only distances change), and
 * together for the stage ring, which must stay round.
 */
export interface FitPoint {
  x: number
  y: number
  /** Screen-pixel reach to the left, right, above and below the point. */
  l: number
  r: number
  t: number
  b: number
}

export interface Camera {
  x: number
  y: number
  kx: number
  ky: number
}

export interface Pad {
  l: number
  r: number
  t: number
  b: number
}

export const K_MIN = 0.4
export const K_MAX = 1.3

function largest(fits: (k: number) => boolean, kMin: number): number {
  if (fits(K_MAX)) return K_MAX
  let lo = kMin
  let hi = K_MAX
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

function span(points: FitPoint[], k: number, axis: 'x' | 'y') {
  const [a, b] = axis === 'x' ? (['l', 'r'] as const) : (['t', 'b'] as const)
  let lo = Infinity
  let hi = -Infinity
  for (const p of points) {
    lo = Math.min(lo, p[axis] * k - p[a])
    hi = Math.max(hi, p[axis] * k + p[b])
  }
  return { lo, hi }
}

/** `kMin` lets the camera pull further back than usual (connection lines can span the whole tree). */
export function fitCamera(points: FitPoint[], width: number, height: number, pad: Pad, uniform: boolean, kMin = K_MIN): Camera {
  if (points.length === 0) return { x: width / 2, y: height / 2, kx: 1, ky: 1 }
  const availX = width - pad.l - pad.r
  const availY = height - pad.t - pad.b
  const fitsX = (k: number) => {
    const e = span(points, k, 'x')
    return e.hi - e.lo <= availX
  }
  const fitsY = (k: number) => {
    const e = span(points, k, 'y')
    return e.hi - e.lo <= availY
  }
  let kx = largest(fitsX, kMin)
  let ky = largest(fitsY, kMin)
  if (uniform) kx = ky = Math.min(kx, ky)
  const ex = span(points, kx, 'x')
  const ey = span(points, ky, 'y')
  return {
    kx,
    ky,
    x: pad.l + (availX - (ex.hi - ex.lo)) / 2 - ex.lo,
    y: pad.t + (availY - (ey.hi - ey.lo)) / 2 - ey.lo,
  }
}
