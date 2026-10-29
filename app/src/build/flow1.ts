// Question flow 1 (spec section 8.1, "I know my model"): after the model is picked, a few
// data questions narrow each stage's steps and fill the Passport. Questions narrow, they never
// pick: `narrow` only removes steps the rules already rule out for the answers given.
//
// The profile questions live here rather than in content/questions/: that folder's schema is
// one file per stage and every answer must name a page, which these questions do not fit.
import type { ItemRecord, QuestionStem, StageId, TaskType, TrackId } from '../content/types.ts'
import { matchesCondition, type DataProfile } from './validate.ts'

/** The Passport fields the data questions can set. Task type and track come from the model. */
export type ProfileField = 'has_categoricals' | 'has_missing' | 'time_ordered' | 'imbalanced'

export interface ProfileQuestion {
  id: string
  stem: QuestionStem
  /** User wording, in the stem's voice, 80 characters or fewer. */
  text: string
  /** The Passport field this question answers. */
  field: ProfileField
  /** Task types the question applies to; absent means every task. */
  task_types?: TaskType[]
}

/** Question order is the order asked. */
export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  { id: 'profile-missing', stem: 'my_data_is', text: 'My data has missing values', field: 'has_missing' },
  {
    id: 'profile-categories',
    stem: 'my_data_is',
    text: 'My data has text categories, like colour or city',
    field: 'has_categoricals',
  },
  { id: 'profile-time-order', stem: 'my_data_is', text: 'My rows are in time order', field: 'time_ordered' },
  {
    id: 'profile-imbalanced',
    stem: 'my_data_is',
    text: 'One outcome is much rarer than the others',
    field: 'imbalanced',
    task_types: ['classification'],
  },
]

/** Most questions asked before the first proposals appear (spec: 3 to 4). */
export const MAX_QUESTIONS = 4

/**
 * Answers keyed by question id. `true` or `false` sets the field. `null` means skipped: the
 * field stays unset. A missing key means the question has not been reached yet.
 */
export type ProfileAnswers = Partial<Record<string, boolean | null>>

/** The task type a model fixes, or undefined when it is task-agnostic or fits several tasks. */
function taskOf(model: ItemRecord): TaskType | undefined {
  return model.rules.task_types.length === 1 ? model.rules.task_types[0] : undefined
}

/** The Passport fields known so far: task type and track from the model, the rest from answers. */
export function profileFor(model: ItemRecord, answers: ProfileAnswers): Partial<DataProfile> {
  const profile: Partial<DataProfile> = applyAnswers(answers)
  const task = taskOf(model)
  if (task !== undefined) profile.task_type = task
  if (model.tracks.length === 1) profile.track = model.tracks[0] as TrackId
  return profile
}

/** Next data question for this model, or null when the set is finished or the cap is reached. */
export function nextQuestion(model: ItemRecord, answers: ProfileAnswers): ProfileQuestion | null {
  const asked = Object.values(answers).filter((v) => v !== undefined).length
  if (asked >= MAX_QUESTIONS) return null
  const task = taskOf(model)
  for (const q of PROFILE_QUESTIONS) {
    if (answers[q.id] !== undefined) continue
    // A question that needs a known task is skipped while the model's task is unknown.
    if (q.task_types && (task === undefined || !q.task_types.includes(task))) continue
    return q
  }
  return null
}

/** Passport fields from the answers. Skipped and unanswered questions leave their field unset. */
export function applyAnswers(answers: ProfileAnswers): Partial<DataProfile> {
  const out: Partial<DataProfile> = {}
  for (const q of PROFILE_QUESTIONS) {
    const a = answers[q.id]
    if (typeof a === 'boolean') out[q.field] = a
  }
  return out
}

/** Whether a record survives the known Passport fields: track, task type and blocking rules. */
function fits(r: ItemRecord, profile: Partial<DataProfile>): boolean {
  if (profile.track !== undefined && !r.tracks.includes(profile.track)) return false
  if (
    profile.task_type !== undefined &&
    r.rules.task_types.length > 0 &&
    !r.rules.task_types.includes(profile.task_type)
  ) {
    return false
  }
  // An unset field never matches a condition (matchesCondition), so no rule fires on it.
  return !r.rules.blocked_when.some((b) => matchesCondition(b.when, profile as DataProfile))
}

/**
 * Ids of the stage's records that survive the answers. If nothing survives, every record of
 * the stage is returned, so a stage is never left empty by narrowing.
 */
export function narrow(stage: StageId, answers: ProfileAnswers, model: ItemRecord, records: ItemRecord[]): string[] {
  const profile = profileFor(model, answers)
  const inStage = records.filter((r) => r.stage === stage)
  const kept = inStage.filter((r) => fits(r, profile)).map((r) => r.id)
  return kept.length > 0 ? kept : inStage.map((r) => r.id)
}
