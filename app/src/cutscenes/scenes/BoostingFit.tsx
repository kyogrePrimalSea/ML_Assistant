import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { SceneProps } from '../types'

export interface BoostingData {
  x_label: string
  y_label: string
  points: { x: number; y: number }[]
  grid_x: number[]
  rounds: number[][]
}

const W = 480
const H = 260
const PAD = { l: 44, r: 16, t: 16, b: 38 }
const px = (x: number) => PAD.l + x * (W - PAD.l - PAD.r)
const py = (y: number) => H - PAD.b - y * (H - PAD.t - PAD.b)

/** Step function through the grid values, drawn as flat runs joined by vertical risers. */
export function stepPath(gx: number[], ys: number[]): string {
  const edge = (i: number) => (i === 0 ? 0 : i === gx.length ? 1 : (gx[i - 1] + gx[i]) / 2)
  let d = ''
  ys.forEach((y, i) => {
    d += `${i === 0 ? 'M' : 'L'}${px(edge(i)).toFixed(1)},${py(y).toFixed(1)}L${px(edge(i + 1)).toFixed(1)},${py(y).toFixed(1)}`
  })
  return d
}

/** Fit at a fractional round: linear blend of the two neighbouring rounds. */
export function blend(rounds: number[][], t: number): number[] {
  const lo = Math.min(Math.floor(t), rounds.length - 1)
  const hi = Math.min(lo + 1, rounds.length - 1)
  const f = t - lo
  return rounds[lo].map((v, i) => v + (rounds[hi][i] - v) * f)
}

export function BoostingFit({ data, reduced, run, visible, onState }: SceneProps & { data: BoostingData }) {
  const last = data.rounds.length - 1
  const pathRef = useRef<SVGPathElement>(null)
  const [round, setRound] = useState(reduced ? last : 0)
  const tween = useRef<gsap.core.Tween | null>(null)
  const onStateRef = useRef(onState)
  useEffect(() => {
    onStateRef.current = onState
  })

  useEffect(() => {
    const draw = (t: number) => {
      pathRef.current?.setAttribute('d', stepPath(data.grid_x, blend(data.rounds, t)))
      setRound(Math.round(t))
    }
    tween.current?.kill()
    if (reduced) {
      draw(last)
      onStateRef.current('done')
      return
    }
    const state = { t: 0 }
    draw(0)
    onStateRef.current('playing')
    tween.current = gsap.to(state, {
      t: last,
      duration: 1.1,
      ease: 'power2.inOut',
      paused: true,
      onUpdate: () => draw(state.t),
      onComplete: () => {
        draw(last)
        onStateRef.current('done')
      },
    })
    return () => {
      tween.current?.kill()
    }
  }, [data, reduced, run, last])

  useEffect(() => {
    const tw = tween.current
    if (!tw || tw.progress() >= 1) return
    if (visible) tw.play()
    else tw.pause()
  }, [visible, run, reduced])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="House size against price with a boosted fit line forming">
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--border-strong)" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--border-strong)" />
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
        {data.x_label}
      </text>
      <text x={14} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fontSize="12" fill="var(--text-muted)" transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}>
        {data.y_label}
      </text>
      {data.points.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3.2} fill="var(--text-muted)" opacity={0.55} />
      ))}
      <path
        ref={pathRef}
        d={stepPath(data.grid_x, data.rounds[reduced ? last : 0])}
        fill="none"
        stroke="var(--stage-model)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text x={PAD.l + 12} y={PAD.t + 12} textAnchor="start" fontSize="13" fontWeight={700} fill="var(--text)" style={{ fontFamily: 'var(--font-code)' }} data-round>
        {round === 0 ? 'start: average price' : `tree ${round} of ${last}`}
      </text>
    </svg>
  )
}
