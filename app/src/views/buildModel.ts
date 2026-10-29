// Pure helpers for the Build (beta) view: profile derivation, the capsule write-up and mark labels.
// Everything shown comes from record fields; nothing is written fresh here.
import type { Mark } from '@/build/compat'
import { profileFor, type ProfileAnswers } from '@/build/flow1'
import { profileOf, type Flow2Answers } from '@/build/flow2'
import type { DataProfile } from '@/build/validate'
import type { ItemRecord, TaskType, TrackId } from '@/content/types'

export const NO_SUMMARY = 'No summary yet'

/** Mark word and Journey-globe status word for each mark. Colour always travels with an icon and a label. */
export const MARK_LABEL: Record<Mark, string> = {
  green: 'Compatible',
  yellow: 'Not recommended',
  red: 'Incompatible',
}

export const MARK_TO_SEVERITY = { green: 'valid', yellow: 'warn', red: 'block' } as const

export type FlagField = 'has_categoricals' | 'has_missing' | 'time_ordered' | 'imbalanced'

/** Flow 2 answer fields to the flow 1 profile question ids, so a chosen model keeps what was answered. */
const FLOW2_TO_PROFILE: [keyof Flow2Answers, string][] = [
  ['has_missing', 'profile-missing'],
  ['has_categoricals', 'profile-categories'],
  ['time_ordered', 'profile-time-order'],
  ['imbalanced', 'profile-imbalanced'],
]

/** Flow 1 answers carried over from flow 2 answers (skipped stays skipped). */
export function answersFromFlow2(a: Flow2Answers): ProfileAnswers {
  const out: ProfileAnswers = {}
  for (const [field, id] of FLOW2_TO_PROFILE) {
    const v = a[field]
    if (typeof v === 'boolean' || v === null) out[id] = v
  }
  return out
}

/** Task type and track fixed by flow 2 answers, kept as Passport edits once a model is picked. */
export function overridesFromFlow2(a: Flow2Answers): Partial<DataProfile> {
  const p = profileOf(a)
  return p ? { task_type: p.task_type, track: p.track } : {}
}

const GOAL_DEFAULT = { has_categoricals: false, has_missing: false, time_ordered: false, imbalanced: false }

/**
 * The working Passport. Order of precedence, lowest first: the goal's task and track, what the chosen
 * model fixes, the data answers, then the user's own edits to the Passport chips.
 */
export function deriveProfile(
  goal: { task: TaskType; track: TrackId },
  model: ItemRecord | null,
  answers: ProfileAnswers,
  flow2: Flow2Answers | null,
  overrides: Partial<DataProfile>,
): DataProfile {
  const fromFlow2 = flow2 ? profileOf(flow2) : null
  const known = model ? profileFor(model, answers) : {}
  const defined = (o: Partial<DataProfile>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  return {
    task_type: goal.task,
    track: goal.track,
    ...GOAL_DEFAULT,
    ...(fromFlow2 ? defined(fromFlow2) : {}),
    ...defined(known),
    ...defined(overrides),
  } as DataProfile
}

/** Short write-up for a capsule, from the page's own record fields. Empty when the page has none. */
export function writeUp(r: ItemRecord): string[] {
  const out: string[] = []
  const solves = r.slots.solves
  if ('line' in solves && solves.line.trim()) out.push(solves.line.trim())
  const intuition = r.slots.intuition
  if ('idea' in intuition && intuition.idea.trim()) out.push(intuition.idea.trim())
  else if ('text' in intuition && intuition.text.trim()) out.push(intuition.text.trim())
  return out
}
