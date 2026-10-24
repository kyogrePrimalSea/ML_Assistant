// Hand-written mirror of content/schema/item.schema.json, question.schema.json and the
// build-content.mjs output. Keep in step with the schemas.

export type StageId =
  | 'explore' | 'clean' | 'transform' | 'select' | 'split' | 'model' | 'tune' | 'evaluate' | 'interpret'
export type TrackId = 'standard' | 'time-series' | 'unsupervised' | 'causal' | 'deep-learning'
export type ArchetypeId =
  | 'transformer' | 'resampler' | 'selector' | 'splitter' | 'model' | 'hyperparameter'
  | 'tuning' | 'metric' | 'diagnostic' | 'output' | 'composer'
export type TaskType = 'regression' | 'classification' | 'forecasting'
export type PrepStatus = 'required' | 'recommended' | 'not_needed'
export type DatasetId = 'ames' | 'breast-cancer' | 'airline-passengers'
export type ShapeEffectValue = 'same' | 'grows' | 'shrinks' | 'expands'
export type QuestionStem = 'my_data_is' | 'my_model_is' | 'i_want_to_know'
export type RelationshipType = 'needs' | 'recommended' | 'clashes' | 'alternative_to' | 'pairs_with'

/** Data-profile condition: all keys must match. */
export interface Condition {
  task_type?: TaskType[]
  track?: TrackId[]
  has_categoricals?: boolean
  has_missing?: boolean
  time_ordered?: boolean
  imbalanced?: boolean
}

export interface Rules {
  task_types: TaskType[]
  blocked_when: { when: Condition; reason: string }[]
  fits_on_data: boolean
  shape_effect: { rows: ShapeEffectValue; columns: ShapeEffectValue }
}

export type Hero =
  | { kind: 'transformer'; dataset: DatasetId; columns: string[]; changed: string[] }
  | { kind: 'resampler'; dataset: DatasetId; classes: string[]; before: number[]; after: number[] }
  | { kind: 'selector'; dataset: DatasetId; columns: string[]; kept: string[] }
  | { kind: 'splitter'; rows: number; folds: number; ordered: boolean }
  | { kind: 'model'; dataset: DatasetId; shape: 'boundary' | 'fit_line' }
  | { kind: 'hyperparameter'; dataset: DatasetId; sweep: number[] }
  | { kind: 'tuning'; dims: number; trials: number }
  | { kind: 'metric'; dataset: DatasetId; highlight: string[] }
  | { kind: 'diagnostic'; dataset: DatasetId; chart: string }
  | { kind: 'output'; dataset: DatasetId; plot: 'bar' | 'line' | 'matrix' }
  | { kind: 'composer'; boxes: string[] }

export type None = { none: true }

export interface Solves { hero: Hero; line: string }

export type QuickFacts =
  | None
  | { data_size: string }
  | { values: { page: string; default: string; typical_range: string }[] }
  | { facts: { label: string; value: string }[] }

export interface UseAvoid { use_when: string[]; avoid_when: string[] }

export interface PrepEntry {
  step: { page: string } | { family: string; stage: StageId }
  status: PrepStatus
  why: string
  condition: Condition | null
  unless: { setting: string; value: unknown } | null
}

export interface CodeTab {
  library: string
  target: string
  why_this_library: string
  snippet: string
}

export interface KeySetting { name: string; page: string | null }
export interface KeySettings { tier1: KeySetting[]; tier2: KeySetting[]; tier3: KeySetting[] }

export type WatchItWork =
  | None
  | { dataset: DatasetId; control: { name: string; min: number; max: number; step: number; default: number } }

export type Intuition =
  | None
  | { text: string }
  | {
      idea: string
      analogy: string
      animation: string
      good_at: string[]
      bad_at: string[]
      vs_siblings: { page: string; note: string }[]
      read_more: string[]
    }

export interface WhatComesOutItem {
  name: string
  kind: 'method' | 'attribute' | 'return'
  task: 'classification' | 'regression' | null
  shape: string
  note: string
}

export interface WhatComesOutBody {
  items: WhatComesOutItem[]
  next_step: string | null
  snippet?: string
  snippet_library?: string
  visual: 'proba_table' | 'regression_preds' | 'both' | null
}

export type WhatComesOut = None | WhatComesOutBody

export interface Slots {
  header: Record<string, never>
  solves: Solves | None
  quick_facts: QuickFacts
  use_avoid: UseAvoid
  prep: PrepEntry[]
  code: CodeTab[]
  what_comes_out: WhatComesOut
  catch_outs: string[]
  key_settings: KeySettings
  watch_it_work: WatchItWork
  intuition: Intuition
  next: string[]
}

export interface ItemRecord {
  id: string
  plain_name: string
  code_name: string
  aliases: string[]
  stage: StageId
  family: string
  tracks: TrackId[]
  archetype: ArchetypeId
  question_tags: string[]
  targets: string[]
  applies_to?: string[]
  pairs_with: string[]
  clashes: string[]
  source_urls: string[]
  library_versions: Record<string, string>
  reviewed: boolean
  rules: Rules
  slots: Slots
}

export interface Question {
  id: string
  stem: QuestionStem
  text: string
  stage: StageId
  tracks: TrackId[]
  answers: { page: string; setting?: string }[]
  next: string[]
}

export interface Relationship {
  source: string
  target: string
  type: RelationshipType
  via: string
}

// Vocab (content/schema/vocab.yaml), the parts the app reads.
export interface Vocab {
  stages: { id: StageId; name: string; icon: string; dark: string; light: string }[]
  tracks: { id: TrackId; name: string; wave: number | string }[]
  archetypes: { id: ArchetypeId; name: string; icon: string }[]
  relationship_types: Record<string, unknown>[]
  prep_statuses: { id: PrepStatus; name: string }[]
  severities: { id: string; name: string; icon: string }[]
  data_profile: Record<string, unknown>
  toy_datasets: { id: DatasetId; name: string; task_type: TaskType }[]
  question_stems: { id: QuestionStem; name: string; max_per_stage: number }[]
  shape_effects: ShapeEffectValue[]
}

// index.json
export interface IndexPage {
  id: string
  plain_name: string
  code_name: string
  stage: StageId
  family: string
  archetype: ArchetypeId
  tracks: TrackId[]
  targets: string[]
  libraries: string[]
  applies_to?: string[]
  has_record: boolean
  reviewed: boolean
}

export interface ContentIndex {
  pages: IndexPage[]
  questions: Question[]
  relationships: Relationship[]
  vocab: Vocab
}

// pages/<id>.json
export interface ParamFacts {
  allowed: {
    source: 'constraints' | 'docstring' | 'none'
    options: unknown[]
    intervals: unknown[]
    types: unknown[]
  }
  default: string | null
  effective_default: string | null
}

/** Same facts for every target, or `by_target` when the targets differ. */
export type KeySettingFacts = ParamFacts | { by_target: Record<string, ParamFacts> }

export interface PageData {
  id: string
  record: ItemRecord
  key_setting_facts: Record<string, KeySettingFacts>
}

export interface Loaded<T> {
  data: T | null
  error: Error | null
  loading: boolean
}
