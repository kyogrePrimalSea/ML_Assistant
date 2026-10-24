import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { SceneProps } from '../types'

/** Data file written by tools/gen_hyperparameter_scenes.py (illustrative, normalised 0..1 coordinates). */
export interface HyperData {
  id: string
  setting: string
  x_label: string
  y_label: string
  points: { x: number; y: number }[]
  grid_x: number[]
  sweep_values: number[]
  train_error: number[]
  val_error: number[]
  fit: number[][]
  best: number
  stop_round?: number[]
}

const W = 400
const H = 250
const PAD = { l: 46, r: 14, t: 28, b: 40 }
const FONT = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' } as const

/** Index of the stored value nearest to `v`. The slider snaps to what the data file holds. */
export function nearestIndex(values: number[], v: number): number {
  let best = 0
  for (let i = 1; i < values.length; i++) if (Math.abs(values[i] - v) < Math.abs(values[best] - v)) best = i
  return best
}

export type Verdict = 'under' | 'best' | 'over'

/** Where the stored value sits against the best one. Within 2% of the best validation error counts as the sweet spot. */
export function verdictAt(data: HyperData, i: number): Verdict {
  const bestI = data.sweep_values.indexOf(data.best)
  if (data.val_error[i] <= data.val_error[bestI] * 1.02) return 'best'
  return data.sweep_values[i] < data.best ? 'under' : 'over'
}

export const STATUS: Record<Verdict, string> = {
  under: 'Validation error is still falling: underfitting.',
  best: 'Validation error is near its lowest: close to the sweet spot.',
  over: 'Validation error is rising: overfitting.',
}

function stepPath(gx: number[], ys: number[], px: (x: number) => number, py: (y: number) => number): string {
  const edge = (i: number) => (i === 0 ? 0 : i === gx.length ? 1 : (gx[i - 1] + gx[i]) / 2)
  let d = ''
  ys.forEach((y, i) => {
    d += `${i === 0 ? 'M' : 'L'}${px(edge(i)).toFixed(1)},${py(y).toFixed(1)}L${px(edge(i + 1)).toFixed(1)},${py(y).toFixed(1)}`
  })
  return d
}

/** The two linked panels at one value: behaviour on the left, underfit/overfit curve on the right. */
export function HyperView({ data, value }: { data: HyperData; value: number }) {
  const i = nearestIndex(data.sweep_values, value)
  const verdict = verdictAt(data, i)
  const vals = data.sweep_values
  const lo = vals[0]
  const hi = vals[vals.length - 1]
  const cx = (v: number) => PAD.l + ((v - lo) / (hi - lo || 1)) * (W - PAD.l - PAD.r)
  // Cap the error axis at twice the best validation error so the overfit rise stays visible; early spikes run off the top.
  const bestErr = data.val_error[data.sweep_values.indexOf(data.best)]
  const maxErr = Math.min(Math.max(...data.val_error, ...data.train_error), bestErr * 2)
  const cy = (e: number) => H - PAD.b - (Math.min(e, maxErr) / maxErr) * (H - PAD.t - PAD.b)
  const clipId = `hyper-clip-${data.id}`
  const bx = cx(data.best)
  const line = (errs: number[]) => errs.map((e, k) => `${k ? 'L' : 'M'}${cx(vals[k]).toFixed(1)},${cy(e).toFixed(1)}`).join('')

  const fx = (x: number) => PAD.l + x * (W - PAD.l - PAD.r)
  const fy = (y: number) => H - PAD.b - y * (H - PAD.t - PAD.b)
  const axis = { stroke: 'var(--border-strong)' }
  const label = { fontSize: 12, fill: 'var(--text-muted)', ...FONT }
  const stop = data.stop_round?.[i]
  const shown = `${data.setting} = ${vals[i]}`

  const behaviourLabel = `House size against price. The model's fit line at ${shown}${stop ? `, stopping at round ${stop}` : ''}: ${STATUS[verdict]}`
  const curveLabel = `Error against ${data.setting}. Training error falls as the setting grows, validation error is lowest at ${data.best}. Currently ${vals[i]}: training error ${data.train_error[i]}, validation error ${data.val_error[i]}.`

  return (
    <div data-hyper-view data-verdict={verdict} className="@container min-w-0">
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={behaviourLabel}>
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} {...axis} />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} {...axis} />
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 12} textAnchor="middle" {...label}>
            {data.x_label}
          </text>
          <text x={14} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" {...label} transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}>
            {data.y_label}
          </text>
          {data.points.map((p, k) => (
            <circle key={k} cx={fx(p.x)} cy={fy(p.y)} r={2.8} fill="var(--text-muted)" opacity={0.55} />
          ))}
          <path
            d={stepPath(data.grid_x, data.fit[i], fx, fy)}
            fill="none"
            stroke="var(--stage-model)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <text x={PAD.l + 10} y={PAD.t - 10} fontSize={13} fontWeight={700} fill="var(--text)" {...FONT} data-value>
            {shown}
            {stop ? `, stops at round ${stop}` : ''}
          </text>
        </svg>

        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={curveLabel}>
          <rect x={PAD.l} y={PAD.t} width={Math.max(bx - PAD.l, 0)} height={H - PAD.t - PAD.b} fill="var(--tip-bg)" />
          <rect x={bx} y={PAD.t} width={Math.max(W - PAD.r - bx, 0)} height={H - PAD.t - PAD.b} fill="var(--warn-bg)" />
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} {...axis} />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} {...axis} />
          <text x={PAD.l + 6} y={PAD.t + 14} fontSize={12} fontWeight={700} fill="var(--text)" {...FONT}>
            {bx - PAD.l > 70 ? '← Underfit' : ''}
          </text>
          <text x={W - PAD.r - 6} y={PAD.t + 14} fontSize={12} fontWeight={700} fill="var(--text)" textAnchor="end" {...FONT}>
            {W - PAD.r - bx > 70 ? 'Overfit →' : ''}
          </text>
          <line x1={bx} y1={PAD.t} x2={bx} y2={H - PAD.b} stroke="var(--text)" strokeWidth={1.5} strokeDasharray="2 3" />
          <path d={`M${bx - 5},${H - PAD.b + 9}L${bx},${H - PAD.b + 2}L${bx + 5},${H - PAD.b + 9}Z`} fill="var(--text)" />
          <text x={Math.min(Math.max(bx, PAD.l + 38), W - PAD.r - 38)} y={H - PAD.b + 22} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)" {...FONT}>
            Sweet spot {data.best}
          </text>
          <text x={PAD.l} y={H - 2} fontSize={11} fill="var(--text-muted)" {...FONT}>{lo}</text>
          <text x={W - PAD.r} y={H - 2} fontSize={11} fill="var(--text-muted)" textAnchor="end" {...FONT}>{hi}</text>
          <text x={14} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" {...label} transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}>
            Error
          </text>
          <clipPath id={clipId}>
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <path d={line(data.train_error)} fill="none" stroke="var(--text)" strokeWidth={2.2} />
            <path d={line(data.val_error)} fill="none" stroke="var(--stage-model)" strokeWidth={2.5} strokeDasharray="7 4" />
          </g>
          <line x1={cx(vals[i])} y1={PAD.t} x2={cx(vals[i])} y2={H - PAD.b} stroke="var(--text-muted)" strokeWidth={1} />
          <circle cx={cx(vals[i])} cy={cy(data.train_error[i])} r={4.5} fill="var(--text)" stroke="var(--surface-1)" strokeWidth={1.5} />
          <rect x={cx(vals[i]) - 4.5} y={cy(data.val_error[i]) - 4.5} width={9} height={9} fill="var(--stage-model)" stroke="var(--surface-1)" strokeWidth={1.5} />
          <g transform={`translate(${PAD.l + 8},${PAD.t - 12})`} fontSize={12} fill="var(--text)" {...FONT}>
            <line x1={0} y1={0} x2={22} y2={0} stroke="var(--text)" strokeWidth={2.2} />
            <text x={27} y={4}>Train</text>
            <line x1={78} y1={0} x2={100} y2={0} stroke="var(--stage-model)" strokeWidth={2.5} strokeDasharray="7 4" />
            <text x={105} y={4}>Validation (dashed)</text>
          </g>
        </svg>
      </div>
    </div>
  )
}

/** Hero for the hyperparameter pages: steps once through the record's sweep values, ending on the last. */
export function HyperHero({ data, sweep, reduced, run, visible, onState }: SceneProps & { data: HyperData; sweep: number[] }) {
  const last = Math.max(sweep.length - 1, 0)
  const [step, setStep] = useState(reduced ? last : 0)
  const tween = useRef<gsap.core.Tween | null>(null)
  const onStateRef = useRef(onState)
  useEffect(() => {
    onStateRef.current = onState
  })

  useEffect(() => {
    const show = (k: number) => setStep(k)
    tween.current?.kill()
    if (reduced || last === 0) {
      show(last)
      onStateRef.current('done')
      return
    }
    const state = { t: 0 }
    show(0)
    onStateRef.current('playing')
    tween.current = gsap.to(state, {
      t: last,
      duration: 1.1,
      ease: 'none',
      paused: true,
      onUpdate: () => show(Math.round(state.t)),
      onComplete: () => {
        show(last)
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

  return <HyperView data={data} value={sweep[step] ?? data.best} />
}
