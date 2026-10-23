// The journey as data: stops in stage order, legs with validity, and fixed globe positions.
// Positions are constants (spec: positions are precomputed and stored, nothing re-lays-out).
import type { ItemRecord, StageId } from '../content/types.ts'
import { shapesAlong, type Shape, type ShapeOverride } from './shape.ts'
import {
  STAGE_ORDER, legStatus, sortPicks, stopStatus, validatePipeline, worstStatus,
  type DataProfile, type Issue, type StopStatus,
} from './validate.ts'

export interface LatLng { lat: number; lng: number }

/** Where the passport sits, and the centre of each stage region: a gentle west-to-east route. */
export const PASSPORT_POSITION: LatLng = { lat: 7, lng: -66 }
export const REGION_CENTRES: Record<StageId, LatLng> = {
  explore: { lat: 14, lng: -52 },
  clean: { lat: -2, lng: -39 },
  transform: { lat: 14, lng: -26 },
  select: { lat: -2, lng: -13 },
  split: { lat: 14, lng: 0 },
  model: { lat: -2, lng: 13 },
  tune: { lat: 14, lng: 26 },
  evaluate: { lat: -2, lng: 39 },
  interpret: { lat: 14, lng: 52 },
}
export const REGION_RADIUS_DEG = 4.6

/** Stops of one stage sit in a short row across the region centre. */
export function stopPosition(stage: StageId, index: number, count: number): LatLng {
  const c = REGION_CENTRES[stage]
  return { lat: c.lat, lng: c.lng + (index - (count - 1) / 2) * 3.8 }
}

/** Outline of a region as a closed ring of points (degrees). */
export function regionRing(stage: StageId, points = 40): [number, number][] {
  const c = REGION_CENTRES[stage]
  const k = Math.cos((c.lat * Math.PI) / 180)
  const ring = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * 2 * Math.PI
    return [c.lat + REGION_RADIUS_DEG * Math.sin(a), c.lng + (REGION_RADIUS_DEG * Math.cos(a)) / k] as [number, number]
  })
  return [...ring, ring[0]]
}

export interface Stop {
  /** 1-based stop number along the route. */
  n: number
  record: ItemRecord
  status: StopStatus
  before: Shape
  after: Shape
  note?: string
  position: LatLng
  issues: Issue[]
}

export interface Leg {
  from: LatLng
  to: LatLng
  /** `start` is the hop from the passport to the first stop. */
  status: 'start' | 'valid' | 'warn' | 'block'
  /** Stop numbers (0 is the passport). */
  fromN: number
  toN: number
  /** A short low hop inside one stage, as opposed to a long arc between stages. */
  withinStage: boolean
}

export interface StageSummary {
  stage: StageId
  stops: Stop[]
  /** `skipped` stages are flown over. */
  status: StopStatus | 'skipped'
}

export interface Journey {
  stops: Stop[]
  legs: Leg[]
  stages: StageSummary[]
  issues: Issue[]
}

export function buildJourney(
  profile: DataProfile,
  records: ItemRecord[],
  start: { rows: number; columns: number },
  opts: { fixed?: ReadonlySet<string>; shapeOverrides?: Record<string, ShapeOverride>; pageNames?: Record<string, string> } = {},
): Journey {
  const fixed = opts.fixed ?? new Set<string>()
  const picks = sortPicks(records.map((record) => ({ record })))
  const issues = validatePipeline(profile, picks, { pageNames: opts.pageNames })
  const shapes = shapesAlong(start, picks, opts.shapeOverrides)

  const perStage = new Map<StageId, number>()
  for (const p of picks) perStage.set(p.record.stage, (perStage.get(p.record.stage) ?? 0) + 1)
  const seen = new Map<StageId, number>()
  const stops: Stop[] = picks.map((p, i) => {
    const stage = p.record.stage
    const k = seen.get(stage) ?? 0
    seen.set(stage, k + 1)
    return {
      n: i + 1,
      record: p.record,
      status: stopStatus(p.record.id, issues, fixed),
      before: shapes[i].before,
      after: shapes[i].after,
      note: shapes[i].note,
      position: stopPosition(stage, k, perStage.get(stage) ?? 1),
      issues: issues.filter((x) => x.pageId === p.record.id),
    }
  })

  const legs: Leg[] = stops.map((s, i) => {
    const prev = stops[i - 1]
    return {
      from: prev ? prev.position : PASSPORT_POSITION,
      to: s.position,
      status: prev ? legStatus(prev.status, s.status) : 'start',
      fromN: prev ? prev.n : 0,
      toN: s.n,
      withinStage: prev ? prev.record.stage === s.record.stage : false,
    }
  })

  const stages: StageSummary[] = STAGE_ORDER.map((stage) => {
    const here = stops.filter((s) => s.record.stage === stage)
    return { stage, stops: here, status: here.length ? worstStatus(here.map((s) => s.status)) : 'skipped' }
  })
  return { stops, legs, stages, issues }
}
