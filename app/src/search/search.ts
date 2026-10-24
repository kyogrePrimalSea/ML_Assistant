// Global search (spec 3.5, A3): a small client-side fuzzy matcher over the taxonomy nodes, the pages and the
// symptom questions. No dependency: every query word must match some field, by word, prefix, substring or one typo.
import type { ContentIndex, QuestionStem, StageId, TaxNode } from '@/content/types'
import type { LabelMode } from '@/shell/ShellState'

export type SearchKind = 'stage' | 'group' | 'family' | 'page' | 'question'

interface Field {
  text: string
  words: string[]
  weight: number
}

interface PerGoal {
  names: string
  question: string
  sentence: string
  pickWhen: string
}

export interface SearchDoc {
  key: string
  kind: SearchKind
  id: string
  stage: StageId
  /** Goals whose view holds this node or page (questions: goals on one of its tracks). */
  goals: string[]
  perGoal: Record<string, PerGoal>
  /** Fallback texts when the doc has no per-goal entry (a question or a page outside every view). */
  plain: string
  code: string
  stemName: string
  fields: Field[]
}

export interface SearchResult {
  doc: SearchDoc
  score: number
  inGoal: boolean
}

export interface SearchResults {
  here: SearchResult[]
  other: SearchResult[]
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const field = (text: string | null | undefined, weight: number): Field | null => {
  const t = norm(text ?? '')
  return t ? { text: t, words: t.split(' '), weight } : null
}

const LEVEL_KIND: Record<TaxNode['level'], SearchKind> = { stage: 'stage', group: 'group', family: 'family', page: 'page' }

export function buildSearchDocs(index: ContentIndex): SearchDoc[] {
  const docs = new Map<string, SearchDoc>()
  const pageById = new Map(index.pages.map((p) => [p.id, p]))
  const stems = new Map(index.vocab.question_stems.map((s) => [s.id, s.name]))

  for (const goal of index.taxonomy.goals) {
    const walk = (n: TaxNode, stage: StageId) => {
      let d = docs.get(n.id)
      if (!d) {
        const page = n.level === 'page' ? pageById.get(n.id) : undefined
        d = {
          key: `n:${n.id}`,
          kind: LEVEL_KIND[n.level],
          id: n.id,
          stage,
          goals: [],
          perGoal: {},
          plain: page?.plain_name ?? n.shown_as ?? n.names_label ?? n.id,
          code: page?.code_name ?? '',
          stemName: '',
          fields: [],
        }
        docs.set(n.id, d)
      }
      d.goals.push(goal.id)
      d.perGoal[goal.id] = {
        names: n.names_label ?? n.id,
        question: n.question_label ?? n.names_label ?? n.id,
        sentence: n.question_sentence ?? '',
        pickWhen: n.pick_when ?? '',
      }
      n.children.forEach((c) => walk(c, stage))
    }
    for (const s of index.taxonomy.views[goal.id] ?? []) walk(s, s.id as StageId)
  }

  // Pages no goal view holds are still findable, under the goals on their tracks.
  for (const p of index.pages) {
    if (docs.has(p.id)) continue
    docs.set(p.id, {
      key: `n:${p.id}`,
      kind: 'page',
      id: p.id,
      stage: p.stage,
      goals: index.taxonomy.goals.filter((g) => p.tracks.includes(g.track)).map((g) => g.id),
      perGoal: {},
      plain: p.plain_name,
      code: p.code_name,
      stemName: '',
      fields: [],
    })
  }

  for (const d of docs.values()) {
    const page = d.kind === 'page' ? pageById.get(d.id) : undefined
    const per = Object.values(d.perGoal)
    const f = [
      ...per.flatMap((g) => [field(g.names, 10), field(g.question, 10), field(g.sentence, 6), field(g.pickWhen, 5)]),
      field(d.plain, 10),
      field(d.code, 9),
      ...(page?.aliases ?? []).map((a) => field(a, 8)),
      field(d.id, 3),
    ]
    d.fields = f.filter((x): x is Field => x !== null)
  }

  for (const q of index.questions) {
    const stemName = stems.get(q.stem as QuestionStem) ?? ''
    // A question belongs to the goals its answers belong to; tracks alone can't tell
    // regression from classification.
    const answerGoals = new Set(q.answers.flatMap((a) => docs.get(a.page)?.goals ?? []))
    const goals = answerGoals.size
      ? index.taxonomy.goals.filter((g) => answerGoals.has(g.id)).map((g) => g.id)
      : index.taxonomy.goals.filter((g) => q.tracks.includes(g.track)).map((g) => g.id)
    const d: SearchDoc = {
      key: `q:${q.id}`,
      kind: 'question',
      id: q.id,
      stage: q.stage,
      goals,
      perGoal: {},
      plain: q.text,
      code: '',
      stemName,
      fields: [],
    }
    d.fields = [field(q.text, 10), field(stemName, 4), field(q.id, 3)].filter((x): x is Field => x !== null)
    docs.set(d.key, d)
  }
  return [...docs.values()]
}

/** True when the two words differ by at most one insertion, deletion or substitution. */
function withinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (i === a.length || i === b.length) return true
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

/** How well one query word matches a field: 0 for none, up to 1 for an exact word. */
function wordScore(token: string, f: Field): number {
  let best = 0
  for (const w of f.words) {
    if (w === token) return 1
    if (w.startsWith(token)) best = Math.max(best, 0.9)
    else if (token.length >= 3 && w.includes(token)) best = Math.max(best, 0.6)
    else if (token.length >= 4 && best < 0.5 && (withinOne(token, w) || withinOne(token, w.slice(0, token.length)))) best = 0.5
  }
  // A query word such as "xgboost," against a field written "XG Boost" still matches as a whole-text substring.
  if (best === 0 && token.length >= 3 && f.text.replace(/ /g, '').includes(token)) best = 0.4
  return best
}

function scoreDoc(doc: SearchDoc, tokens: string[]): number {
  let total = 0
  for (const t of tokens) {
    let best = 0
    for (const f of doc.fields) best = Math.max(best, wordScore(t, f) * f.weight)
    if (best === 0) return 0
    total += best
  }
  return total / tokens.length
}

export function runSearch(docs: SearchDoc[], query: string, goal: string, limit = 40): SearchResults {
  const tokens = norm(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return { here: [], other: [] }
  const all: SearchResult[] = []
  for (const doc of docs) {
    const score = scoreDoc(doc, tokens)
    if (score > 0) all.push({ doc, score, inGoal: doc.goals.includes(goal) })
  }
  all.sort((a, b) => b.score - a.score || a.doc.plain.localeCompare(b.doc.plain))
  return {
    here: all.filter((r) => r.inGoal).slice(0, limit),
    other: all.filter((r) => !r.inGoal).slice(0, limit),
  }
}

const entryFor = (d: SearchDoc, goal: string): PerGoal | undefined => d.perGoal[goal] ?? Object.values(d.perGoal)[0]

/** The main line in the current label set, and the muted second line. */
export function displayOf(d: SearchDoc, mode: LabelMode, goal: string): { label: string; second: string } {
  const e = entryFor(d, goal)
  if (d.kind === 'question') return { label: d.plain, second: d.stemName }
  if (d.kind === 'page') return { label: d.plain, second: e?.pickWhen || d.code }
  if (!e) return { label: d.plain, second: '' }
  return mode === 'questions' ? { label: e.question, second: e.names } : { label: e.names, second: e.question }
}
