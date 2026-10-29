// Proposals per stage (spec section 8.1). Pure functions over `compat.ts` marks and record fields.
// Pros and cons are copied from record fields only (`use_avoid`, `intuition`, `catch_outs`); nothing
// is written fresh here. A record with no such fields gets empty arrays, and the UI shows "no summary yet".
import { markFor, type Mark, type MarkResult } from './compat.ts'
import type { DataProfile, Issue, Pick } from './validate.ts'
import { TEMPLATED_PAGE_IDS } from './notebookV2.ts'
import type { ItemRecord, StageId } from '../content/types.ts'

export interface Proposal {
  id: string
  name: string
  mark: Mark
  pros: string[]
  cons: string[]
  /** Issues about the candidate (from `markFor`). Empty when the mark is green. */
  reasons: Issue[]
}

const MAX_PROS_CONS = 3
const MAX_PROPOSALS = 4

const TEMPLATED: ReadonlySet<string> = new Set(TEMPLATED_PAGE_IDS)

const MARK_RANK: Record<Mark, number> = { green: 0, yellow: 1, red: 2 }

/** Collapse whitespace so each string is one line. Keep the first `MAX_PROS_CONS` distinct, non-empty ones. */
function oneLines(items: string[]): string[] {
  const out: string[] = []
  for (const raw of items) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (line && !out.includes(line)) out.push(line)
  }
  return out.slice(0, MAX_PROS_CONS)
}

function prosOf(r: ItemRecord): string[] {
  const intuition = r.slots.intuition
  const good = 'good_at' in intuition ? intuition.good_at : []
  return oneLines([...r.slots.use_avoid.use_when, ...good])
}

function consOf(r: ItemRecord): string[] {
  const intuition = r.slots.intuition
  const bad = 'bad_at' in intuition ? intuition.bad_at : []
  return oneLines([...r.slots.use_avoid.avoid_when, ...bad, ...r.slots.catch_outs])
}

/** How well a record suits the profile, from its own fields: 0 to 2. Used only to break ties between equal marks. */
function fit(r: ItemRecord, profile: DataProfile): number {
  let score = 0
  if (r.tracks.includes(profile.track)) score++
  if (r.rules.task_types.length === 0 || r.rules.task_types.includes(profile.task_type)) score++
  return score
}

interface Scored {
  proposal: Proposal
  fit: number
  templated: boolean
}

function scoreAll(
  stage: StageId,
  picks: Pick[],
  profile: DataProfile,
  records: ItemRecord[],
  exclude: ReadonlySet<string>,
): Scored[] {
  return records
    .filter((r) => r.stage === stage && !exclude.has(r.id))
    .map((r) => {
      const result: MarkResult = markFor({ record: r }, picks, profile)
      return {
        proposal: { id: r.id, name: r.plain_name, mark: result.mark, pros: prosOf(r), cons: consOf(r), reasons: result.reasons },
        fit: fit(r, profile),
        templated: TEMPLATED.has(r.id),
      }
    })
    // Mark first, then pages with a notebook template, then profile fit. Stable: ties keep the order of `records`.
    .sort((a, b) =>
      MARK_RANK[a.proposal.mark] - MARK_RANK[b.proposal.mark] || Number(b.templated) - Number(a.templated) || b.fit - a.fit)
}

/**
 * Up to 4 proposals for a stage: items not already picked, ranked green first, then pages with a notebook template, then by fit to the profile.
 */
export function proposeForStage(
  stage: StageId,
  picks: Pick[],
  profile: DataProfile,
  records: ItemRecord[],
): Proposal[] {
  const picked = new Set(picks.map((p) => p.record.id))
  return scoreAll(stage, picks, profile, records, picked)
    .slice(0, MAX_PROPOSALS)
    .map((s) => s.proposal)
}

/** Every item of the stage with its mark, ranked the same way as `proposeForStage`. Picked items are included. */
export function fullList(
  stage: StageId,
  picks: Pick[],
  profile: DataProfile,
  records: ItemRecord[],
): Proposal[] {
  return scoreAll(stage, picks, profile, records, new Set()).map((s) => s.proposal)
}
