// Pipeline validation (spec section 8; derivation table in docs/CONTENT_SCHEMA.md).
// Pure functions over record fields only: `prep`, `rules`, `tracks`, `stage`, `family`.
// Nothing here is hand-written per page. E08 (the full builder) reuses this file.
import type { Condition, ItemRecord, StageId, TaskType, TrackId } from '../content/types.ts'

/** Pipeline order of stages (content/schema/vocab.yaml). */
export const STAGE_ORDER: StageId[] = [
  'explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret',
]

export interface DataProfile {
  task_type: TaskType
  track: TrackId
  has_categoricals: boolean
  has_missing: boolean
  time_ordered: boolean
  imbalanced: boolean
}

export type RuleId =
  | 'missing_requirement'
  | 'wrong_for_track'
  | 'task_mismatch'
  | 'leakage_risk'
  | 'redundant_step'
  | 'missing_recommendation'

export type IssueSeverity = 'block' | 'warn' | 'tip'
export type StopStatus = 'block' | 'warn' | 'tip' | 'valid'

/** One picked step. `settings` are the settings the user changed (used by `unless`). */
export interface Pick {
  record: ItemRecord
  settings?: Record<string, unknown>
}

export interface Issue {
  rule: RuleId
  severity: IssueSeverity
  /** Page id of the pick the issue is about (the stop that turns amber or red). */
  pageId: string
  /** Page id of the record whose fields produced the issue ("Why did this fire" links here). */
  sourceId: string
  message: string
  /** Stable key, used to remember that a one-tap fix was applied. */
  key: string
  /** One-tap fix, for warnings that have one. */
  fix?: { label: string }
}

export interface ValidateOptions {
  /** Display names for page ids that are not in the pipeline (for "needs ..." messages). */
  pageNames?: Record<string, string>
}

const SEVERITY_RANK: Record<StopStatus, number> = { valid: 0, tip: 1, warn: 2, block: 3 }

export function worstStatus(statuses: StopStatus[]): StopStatus {
  return statuses.reduce<StopStatus>((a, b) => (SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a), 'valid')
}

/** Every key in the condition must match the profile (AND). */
export function matchesCondition(cond: Condition | null, profile: DataProfile): boolean {
  if (!cond) return true
  if (cond.task_type && !cond.task_type.includes(profile.task_type)) return false
  if (cond.track && !cond.track.includes(profile.track)) return false
  for (const k of ['has_categoricals', 'has_missing', 'time_ordered', 'imbalanced'] as const) {
    if (cond[k] !== undefined && cond[k] !== profile[k]) return false
  }
  return true
}

type Step = ItemRecord['slots']['prep'][number]['step']

function stepIsPicked(step: Step, picks: Pick[]): boolean {
  return picks.some((p) =>
    'page' in step ? p.record.id === step.page : p.record.family === step.family,
  )
}

/** The pick that satisfies a step, other than `except` (used by the redundant-step rule). */
function pickedFor(step: Step, picks: Pick[], except: Pick): Pick[] {
  return picks.filter(
    (p) =>
      p !== except &&
      ('page' in step ? p.record.id === step.page : p.record.family === step.family),
  )
}

function stepLabel(step: Step, names: Record<string, string>): string {
  return 'page' in step ? (names[step.page] ?? step.page) : `a ${step.family} step`
}

function unlessHolds(pick: Pick, unless: { setting: string; value: unknown } | null): boolean {
  return unless !== null && pick.settings?.[unless.setting] === unless.value
}

const stripDot = (s: string) => s.replace(/\.$/, '')

export function validatePipeline(profile: DataProfile, picks: Pick[], options: ValidateOptions = {}): Issue[] {
  const names = { ...options.pageNames }
  for (const p of picks) names[p.record.id] = p.record.plain_name
  const issues: Issue[] = []
  const add = (i: Omit<Issue, 'key'>) => issues.push({ ...i, key: `${i.rule}:${i.pageId}:${i.sourceId}` })
  const splitIdx = STAGE_ORDER.indexOf('split')

  for (const pick of picks) {
    const r = pick.record
    const name = r.plain_name

    // Wrong for the track (Block): the pick's tracks exclude the passport track, or a blocked_when matches.
    if (!r.tracks.includes(profile.track)) {
      add({ rule: 'wrong_for_track', severity: 'block', pageId: r.id, sourceId: r.id,
        message: `${name} is not for the ${profile.track} track.` })
    }
    for (const b of r.rules.blocked_when) {
      if (matchesCondition(b.when, profile)) {
        add({ rule: 'wrong_for_track', severity: 'block', pageId: r.id, sourceId: r.id, message: b.reason })
      }
    }

    // Task mismatch (Block).
    if (r.rules.task_types.length > 0 && !r.rules.task_types.includes(profile.task_type)) {
      add({ rule: 'task_mismatch', severity: 'block', pageId: r.id, sourceId: r.id,
        message: `${name} does not fit a ${profile.task_type} task.` })
    }

    // Leakage risk (Warn): a step that learns from data sits in a stage before the split.
    if (r.rules.fits_on_data && STAGE_ORDER.indexOf(r.stage) < splitIdx) {
      add({ rule: 'leakage_risk', severity: 'warn', pageId: r.id, sourceId: r.id,
        message: `${name} learns from data before the split, so test rows could leak in.`,
        fix: { label: 'Wrap in a Pipeline' } })
    }

    for (const prep of r.slots.prep) {
      const present = stepIsPicked(prep.step, picks)
      const applies = matchesCondition(prep.condition, profile)

      // Missing requirement (Block).
      if (prep.status === 'required' && applies && !unlessHolds(pick, prep.unless) && !present) {
        add({ rule: 'missing_requirement', severity: 'block', pageId: r.id, sourceId: r.id,
          message: `${name} needs ${stepLabel(prep.step, names)}. ${stripDot(prep.why)}.` })
      }

      // Missing recommendation (Tip).
      if (prep.status === 'recommended' && applies && !unlessHolds(pick, prep.unless) && !present) {
        add({ rule: 'missing_recommendation', severity: 'tip', pageId: r.id, sourceId: r.id,
          message: `${name} works better with ${stepLabel(prep.step, names)}. ${stripDot(prep.why)}.` })
      }

      // Redundant step (Warn): the step is in the pipeline although this pick does not need it.
      if (prep.status === 'not_needed' && applies) {
        for (const other of pickedFor(prep.step, picks, pick)) {
          add({ rule: 'redundant_step', severity: 'warn', pageId: other.record.id, sourceId: r.id,
            message: `${name} does not need ${other.record.plain_name}. ${stripDot(prep.why)}.` })
        }
      }
    }
  }
  return issues
}

/** Status of one stop: the worst open issue about it. `fixed` holds issue keys already fixed. */
export function stopStatus(pageId: string, issues: Issue[], fixed: ReadonlySet<string> = new Set()): StopStatus {
  return worstStatus(issues.filter((i) => i.pageId === pageId && !fixed.has(i.key)).map((i) => i.severity))
}

/** A leg is valid, or touches a warning or a block. Tips do not colour a leg. */
export function legStatus(a: StopStatus, b: StopStatus): 'valid' | 'warn' | 'block' {
  const w = worstStatus([a, b])
  return w === 'block' || w === 'warn' ? w : 'valid'
}

/** Picks sorted into pipeline order (stage order, then the order given). */
export function sortPicks<T extends { record: ItemRecord }>(picks: T[]): T[] {
  return picks
    .map((p, i) => ({ p, i }))
    .sort((a, b) => STAGE_ORDER.indexOf(a.p.record.stage) - STAGE_ORDER.indexOf(b.p.record.stage) || a.i - b.i)
    .map((x) => x.p)
}
