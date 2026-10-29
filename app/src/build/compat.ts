// Three-colour compatibility marks (spec section 8.1). Pure functions over `validate.ts`:
// a candidate is checked by validating `picks + candidate` and keeping the issues that
// are about the candidate. No rule is copied here.
import { validatePipeline, type DataProfile, type Issue, type Pick, type ValidateOptions } from './validate.ts'

export type Mark = 'green' | 'yellow' | 'red'
export type MarkSeverity = 'none' | 'tip' | 'warn' | 'block'

export interface MarkResult {
  mark: Mark
  severity: MarkSeverity
  /** Issues about the candidate. Empty only when `mark` is green. */
  reasons: Issue[]
}

const MARK_RANK: Record<Mark, number> = { green: 0, yellow: 1, red: 2 }

const SEVERITY_RANK: Record<MarkSeverity, number> = { none: 0, tip: 1, warn: 2, block: 3 }

/**
 * Mark for one candidate against the model and the other picks.
 * Issues count when the candidate is the stop they are about (`pageId`) or the page whose
 * fields produced them (`sourceId`). A pick already in `picks` with the same id is replaced
 * by the candidate, so a candidate is never checked against itself.
 * `options` (optional) supplies display names for the reasons' messages.
 */
export function markFor(
  candidate: Pick,
  picks: Pick[],
  profile: DataProfile,
  options?: ValidateOptions,
): MarkResult {
  const id = candidate.record.id
  const others = picks.filter((p) => p.record.id !== id)
  const reasons = validatePipeline(profile, [...others, candidate], options).filter(
    (i) => i.pageId === id || i.sourceId === id,
  )
  const severity = reasons.reduce<MarkSeverity>(
    (worst, i) => (SEVERITY_RANK[i.severity] > SEVERITY_RANK[worst] ? i.severity : worst),
    'none',
  )
  return { mark: markOf(severity), severity, reasons }
}

/** Marks for many candidates. Keyed by record id; each is checked with `markFor`. */
export function markAll(
  candidates: Pick[],
  picks: Pick[],
  profile: DataProfile,
  options?: ValidateOptions,
): Record<string, MarkResult> {
  const out: Record<string, MarkResult> = {}
  for (const c of candidates) out[c.record.id] = markFor(c, picks, profile, options)
  return out
}

/** Worst mark of a list. An empty list is green. */
export function overall(marks: Mark[]): Mark {
  return marks.reduce<Mark>((a, b) => (MARK_RANK[b] > MARK_RANK[a] ? b : a), 'green')
}

/** Block is red; Warn and Tip are yellow; none is green. */
function markOf(severity: MarkSeverity): Mark {
  if (severity === 'block') return 'red'
  if (severity === 'warn' || severity === 'tip') return 'yellow'
  return 'green'
}
