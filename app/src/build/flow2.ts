// Question flow 2 (spec section 8.1, "recommend a model"): for a user without a model, a few
// questions about the prediction and the data produce a short list of model proposals.
//
// Marks come from `compat.ts` (validation over the model pages' own fields). Two kinds of answer:
// - Structured answers (task type, time order, missing values, text categories, imbalance) feed
//   the Passport profile, so the same rules as the pipeline apply.
// - Answers the pages do not state as fields (wide data, size, need to explain) are matched
//   against exact `use_when` / `avoid_when` strings the pages carry (CUES). No phrase is written
//   fresh here, and flow2.test.ts checks that each one appears on a real model page.
//
// Mark rules for this flow (they differ from the pipeline's): a required preparation step is
// yellow, not red, because no step is picked yet and the step is one to add. Only a wrong track
// or a wrong task type is red, and red models are left out of the short list.
import { fullList, type Proposal } from './proposals.ts'
import { markFor } from './compat.ts'
import type { DataProfile, Issue } from './validate.ts'
import type { ItemRecord, QuestionStem, TaskType, TrackId } from '../content/types.ts'

export type Size = 'small' | 'large'

/** Answers keyed by field. `undefined` means not reached; `null` means skipped. */
export interface Flow2Answers {
  task_type?: TaskType | null
  time_ordered?: boolean | null
  has_missing?: boolean | null
  has_categoricals?: boolean | null
  imbalanced?: boolean | null
  /** More columns than rows. */
  wide?: boolean | null
  size?: Size | null
  /** The user needs each prediction explained in terms a person can read. */
  need_explanation?: boolean | null
}

export type Flow2Field = keyof Flow2Answers

export interface Flow2Question {
  id: string
  stem: QuestionStem
  /** User wording, 80 characters or fewer. */
  text: string
  field: Flow2Field
  /** Choice answers; absent means yes or no. */
  choices?: { value: string; label: string }[]
  /** Task types the question applies to; absent means every task. */
  task_types?: TaskType[]
}

/** Question order is the order asked. */
export const FLOW2_QUESTIONS: Flow2Question[] = [
  {
    id: 'flow2-task',
    stem: 'i_want_to_know',
    text: 'The outcome I predict is',
    field: 'task_type',
    choices: [
      { value: 'regression', label: 'A number' },
      { value: 'classification', label: 'A category, such as yes or no' },
    ],
  },
  { id: 'flow2-time-order', stem: 'my_data_is', text: 'My rows are in time order, like daily sales', field: 'time_ordered' },
  { id: 'flow2-missing', stem: 'my_data_is', text: 'My data has missing values', field: 'has_missing' },
  {
    id: 'flow2-categories',
    stem: 'my_data_is',
    text: 'My data has text categories, like colour or city',
    field: 'has_categoricals',
  },
  {
    id: 'flow2-imbalanced',
    stem: 'my_data_is',
    text: 'One outcome is much rarer than the others',
    field: 'imbalanced',
    task_types: ['classification'],
  },
  { id: 'flow2-wide', stem: 'my_data_is', text: 'I have more columns than rows', field: 'wide' },
  {
    id: 'flow2-size',
    stem: 'my_data_is',
    text: 'My data is small or large',
    field: 'size',
    choices: [
      { value: 'small', label: 'Small' },
      { value: 'large', label: 'Large' },
    ],
  },
  {
    id: 'flow2-explain',
    stem: 'i_want_to_know',
    text: 'Why each prediction was made, in terms a person can read',
    field: 'need_explanation',
  },
]

/** Next question not yet reached, or null when every applicable question has an answer. */
export function nextQuestion(answers: Flow2Answers): Flow2Question | null {
  for (const q of FLOW2_QUESTIONS) {
    if (answers[q.field] !== undefined) continue
    // A question for one task type waits until the task is answered as that type.
    if (q.task_types && (answers.task_type == null || !q.task_types.includes(answers.task_type))) continue
    return q
  }
  return null
}

/** Short list length. Matches MAX_PROPOSALS in proposals.ts, which is not exported. */
export const SHORT_LIST_SIZE = 4

type Side = 'use_when' | 'avoid_when'

/**
 * Exact `use_when` / `avoid_when` strings on model pages, grouped by the answer that makes them
 * apply. `avoid_when` matches are yellow; `use_when` matches are green.
 */
const CUES: { field: Flow2Field; value: boolean | Size; side: Side; phrases: string[] }[] = [
  { field: 'wide', value: true, side: 'use_when', phrases: ['wide data', 'more features than rows'] },
  { field: 'size', value: 'small', side: 'avoid_when', phrases: ['tiny data', 'very short data', 'few rows', 'small data'] },
  { field: 'size', value: 'small', side: 'use_when', phrases: ['small data', 'small to medium data', 'up to 10,000 rows'] },
  {
    field: 'size',
    value: 'large',
    side: 'avoid_when',
    phrases: ['large data', 'big data', 'large tables', 'data too big for memory'],
  },
  { field: 'size', value: 'large', side: 'use_when', phrases: ['large data', 'larger data', 'millions of rows', 'plenty of data'] },
  {
    field: 'need_explanation',
    value: true,
    side: 'avoid_when',
    phrases: ['needs one readable model', 'need a simple formula', 'needs a formula', 'need a formula'],
  },
  {
    field: 'need_explanation',
    value: true,
    side: 'use_when',
    phrases: ['rules a person can follow', 'explaining each decision', 'explain each effect', 'readable effects'],
  },
  { field: 'imbalanced', value: true, side: 'use_when', phrases: ['one class is rare', 'lopsided classes'] },
  { field: 'imbalanced', value: false, side: 'avoid_when', phrases: ['classes already balanced'] },
  { field: 'has_missing', value: true, side: 'avoid_when', phrases: ['missing values', 'missing values present'] },
  { field: 'has_missing', value: true, side: 'use_when', phrases: ['missing values'] },
  { field: 'has_categoricals', value: true, side: 'use_when', phrases: ['categorical features', 'mixed feature types'] },
  { field: 'has_categoricals', value: true, side: 'avoid_when', phrases: ['categorical inputs', 'category codes'] },
]

const ANSWER_LABEL: Record<Flow2Field, string> = {
  task_type: 'the outcome type',
  time_ordered: 'time order',
  has_missing: 'missing values',
  has_categoricals: 'text categories',
  imbalanced: 'a rare outcome',
  wide: 'more columns than rows',
  size: 'data size',
  need_explanation: 'the need to explain predictions',
}

/** One answer's effect on one proposal, for the "why is this here" line. */
export interface AnswerNote {
  field: Flow2Field
  effect: 'green' | 'yellow'
  message: string
}

export interface Flow2Proposal extends Proposal {
  /** Answers that made this proposal green or yellow. */
  notes: AnswerNote[]
}

const MARK_RANK = { green: 0, yellow: 1, red: 2 } as const

const answered = <T>(v: T | undefined | null): v is T => v !== undefined && v !== null

/**
 * Data profile from the answers. Undefined until the task type and time order are answered
 * (skipped time order counts as not time-ordered). Unanswered fields stay undefined, so no
 * condition fires on them.
 */
export function profileOf(answers: Flow2Answers): DataProfile | null {
  if (!answered(answers.task_type) || answers.time_ordered === undefined) return null
  const track: TrackId = answers.time_ordered === true ? 'time-series' : 'standard'
  return {
    task_type: answers.task_type,
    track,
    has_categoricals: answers.has_categoricals ?? undefined,
    has_missing: answers.has_missing ?? undefined,
    time_ordered: answers.time_ordered ?? undefined,
    imbalanced: answers.imbalanced ?? undefined,
  } as DataProfile
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

function cueNotes(r: ItemRecord, answers: Flow2Answers): AnswerNote[] {
  const out: AnswerNote[] = []
  for (const cue of CUES) {
    if (answers[cue.field] !== cue.value) continue
    const listed = r.slots.use_avoid[cue.side].map(norm)
    const phrase = cue.phrases.find((p) => listed.includes(p))
    if (phrase === undefined) continue
    const sideText = cue.side === 'avoid_when' ? 'avoid when' : 'use when'
    out.push({
      field: cue.field,
      effect: cue.side === 'avoid_when' ? 'yellow' : 'green',
      message: `Your answer on ${ANSWER_LABEL[cue.field]} (${String(cue.value)}) matches the page's ${sideText} "${phrase}".`,
    })
  }
  return out
}

/**
 * Issues from the pipeline rules that appear only with an answer set. Each one is yellow and is
 * attributed to the answer by removing that answer from the profile and checking which issues vanish.
 * Issues that stay are unconditional on the page, so they get no answer note.
 */
function structuredNotes(r: ItemRecord, profile: DataProfile, answers: Flow2Answers): AnswerNote[] {
  const full: Issue[] = markFor({ record: r }, [], profile).reasons
  const out: AnswerNote[] = []
  for (const field of ['has_missing', 'has_categoricals', 'imbalanced'] as const) {
    if (!answered(answers[field])) continue
    const without = { ...profile, [field]: undefined } as DataProfile
    const stillThere = new Set(markFor({ record: r }, [], without).reasons.map((i) => i.key))
    for (const issue of full) {
      if (!stillThere.has(issue.key)) out.push({ field, effect: 'yellow', message: issue.message })
    }
  }
  return out
}

/**
 * Up to `SHORT_LIST_SIZE` model proposals for the answers: green first, then yellow, then the
 * proposals whose use_when phrases match more of the answers. Red models are left out; they stay
 * in `fullList('model', ...)`. Returns [] until the task type and time order are answered.
 */
export function recommendModels(answers: Flow2Answers, records: ItemRecord[]): Flow2Proposal[] {
  const profile = profileOf(answers)
  if (profile === null) return []
  const byId = new Map(records.filter((r) => r.stage === 'model').map((r) => [r.id, r]))

  const scored = fullList('model', [], profile, records).map((p, index) => {
    const r = byId.get(p.id)
    if (r === undefined) throw new Error(`flow2: no model record for ${p.id}`)
    const red = p.reasons.some((i) => i.rule === 'wrong_for_track' || i.rule === 'task_mismatch')
    const notes: AnswerNote[] = [
      ...(answered(answers.task_type) ? [{ field: 'task_type' as const, effect: 'green' as const, message: `Fits a ${answers.task_type} task.` }] : []),
      ...(answers.time_ordered !== undefined
        ? [
            {
              field: 'time_ordered' as const,
              effect: 'green' as const,
              message: profile.track === 'time-series' ? 'Fits time-ordered rows (time-series track).' : 'Fits rows that are not in time order (standard track).',
            },
          ]
        : []),
      ...cueNotes(r, answers),
      ...structuredNotes(r, profile, answers),
    ]
    const yellow = p.reasons.length > 0 || notes.some((n) => n.effect === 'yellow')
    const mark = red ? 'red' : yellow ? 'yellow' : 'green'
    // Answer matches: green notes other than the task and track confirmations, which every fit gets.
    const matches = notes.filter((n) => n.effect === 'green' && !['task_type', 'time_ordered'].includes(n.field)).length
    // Caveats from the answers: yellow notes. A yellow reason with no answer behind it is a step to add.
    const caveats = notes.filter((n) => n.effect === 'yellow').length
    return { proposal: { ...p, mark, notes } as Flow2Proposal, index, matches, caveats, red }
  })

  // Order: fewest answer caveats, then most answer matches, then green before yellow (steps still
  // to add), then the order fullList gave. A step to add does not outrank a match the answers asked for.
  return scored
    .filter((s) => !s.red)
    .sort(
      (a, b) =>
        a.caveats - b.caveats ||
        b.matches - a.matches ||
        MARK_RANK[a.proposal.mark] - MARK_RANK[b.proposal.mark] ||
        a.index - b.index,
    )
    .slice(0, SHORT_LIST_SIZE)
    .map((s) => s.proposal)
}
