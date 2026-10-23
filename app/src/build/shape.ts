// Data shape after each step (spec 7.3 ticket). Reads `rules.shape_effect`; numbers come from
// the starting shape and from per-pick overrides for steps whose effect depends on settings.
import type { ShapeEffectValue } from '../content/types.ts'
import type { Pick } from './validate.ts'

/** A count, or a word when the step changes it by an amount the guide cannot know. */
export type Count = number | 'more' | 'fewer'
export interface Shape { rows: Count; columns: Count }
export interface ShapeOverride { rows?: number; columns?: number; note?: string }

function step(value: Count, effect: ShapeEffectValue, override: number | undefined): Count {
  if (override !== undefined) return override
  if (effect === 'same') return value
  if (effect === 'shrinks') return 'fewer'
  return 'more'
}

/** Shape before and after each pick, in the order given. */
export function shapesAlong(
  start: { rows: number; columns: number },
  picks: Pick[],
  overrides: Record<string, ShapeOverride> = {},
): { before: Shape; after: Shape; note?: string }[] {
  let cur: Shape = { ...start }
  return picks.map((p) => {
    const e = p.record.rules.shape_effect
    const o = overrides[p.record.id] ?? {}
    const before = cur
    cur = { rows: step(cur.rows, e.rows, o.rows), columns: step(cur.columns, e.columns, o.columns) }
    return { before, after: cur, note: o.note }
  })
}

const fmt = (c: Count) => (typeof c === 'number' ? c.toLocaleString('en-US') : c)
export const formatShape = (s: Shape) => `${fmt(s.rows)} × ${fmt(s.columns)}`
export const shapeChanged = (a: Shape, b: Shape) => a.rows !== b.rows || a.columns !== b.columns
