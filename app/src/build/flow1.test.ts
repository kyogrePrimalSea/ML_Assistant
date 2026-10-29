import { describe, expect, it } from 'vitest'
import type { ItemRecord, Condition } from '../content/types.ts'
import { rec } from './fixtures.ts'
import {
  MAX_QUESTIONS,
  PROFILE_QUESTIONS,
  applyAnswers,
  narrow,
  nextQuestion,
  profileFor,
} from './flow1.ts'

const regressor = (): ItemRecord =>
  rec('lin', 'model', 'model.linear', { rules: { task_types: ['regression'] } }).record
const classifier = (): ItemRecord =>
  rec('logit', 'model', 'model.linear', { rules: { task_types: ['classification'] } }).record

function withBlock(id: string, when: Condition, tracks: ItemRecord['tracks'] = ['standard']): ItemRecord {
  return rec(id, 'transform', 'transform.encode.features', {
    tracks,
    rules: { blocked_when: [{ when, reason: `${id} is blocked` }] },
  }).record
}

describe('nextQuestion', () => {
  it('asks the four data questions in order for a classifier', () => {
    const m = classifier()
    const asked: string[] = []
    const answers: Record<string, boolean | null> = {}
    for (let i = 0; i < 10; i++) {
      const q = nextQuestion(m, answers)
      if (!q) break
      asked.push(q.id)
      answers[q.id] = null
    }
    expect(asked).toEqual(PROFILE_QUESTIONS.map((q) => q.id))
    expect(asked).toHaveLength(MAX_QUESTIONS)
  })

  it('skips the imbalance question for a regressor', () => {
    const m = regressor()
    const answers = { 'profile-missing': true, 'profile-categories': false, 'profile-time-order': false }
    expect(nextQuestion(m, answers)).toBeNull()
  })

  it('skips the imbalance question while the model task is unknown', () => {
    const agnostic = rec('any', 'model', 'model.linear').record
    const answers = { 'profile-missing': true, 'profile-categories': true, 'profile-time-order': true }
    expect(nextQuestion(agnostic, answers)).toBeNull()
  })

  it('never asks a question twice, including skipped ones', () => {
    const m = classifier()
    expect(nextQuestion(m, { 'profile-missing': null })?.id).toBe('profile-categories')
    expect(nextQuestion(m, { 'profile-missing': true })?.id).toBe('profile-categories')
  })

  it('returns null once the cap is reached', () => {
    const m = classifier()
    const answers = Object.fromEntries(PROFILE_QUESTIONS.map((q) => [q.id, null]))
    expect(Object.keys(answers)).toHaveLength(MAX_QUESTIONS)
    expect(nextQuestion(m, answers)).toBeNull()
  })

  it('keeps question ids unique and texts within 80 characters', () => {
    const ids = PROFILE_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of PROFILE_QUESTIONS) expect(q.text.length).toBeLessThanOrEqual(80)
  })
})

describe('applyAnswers', () => {
  it('sets fields for true and false answers', () => {
    expect(applyAnswers({ 'profile-missing': true, 'profile-time-order': false })).toEqual({
      has_missing: true,
      time_ordered: false,
    })
  })

  it('leaves skipped and unasked fields unset', () => {
    const out = applyAnswers({ 'profile-missing': null })
    expect(out).toEqual({})
    expect('has_missing' in out).toBe(false)
    expect(applyAnswers({})).toEqual({})
  })
})

describe('profileFor', () => {
  it('takes task and track from a single-task, single-track model', () => {
    expect(profileFor(classifier(), { 'profile-categories': true })).toEqual({
      task_type: 'classification',
      track: 'standard',
      has_categoricals: true,
    })
  })

  it('leaves task and track unset when the model has several', () => {
    const m = rec('x', 'model', 'model.linear', { tracks: ['standard', 'time-series'] }).record
    const p = profileFor(m, {})
    expect(p.task_type).toBeUndefined()
    expect(p.track).toBeUndefined()
  })
})

describe('narrow', () => {
  const m = regressor()

  it('drops a record whose blocking rule matches an answer', () => {
    const blocked = withBlock('no-cats', { has_categoricals: true })
    const open = rec('plain', 'transform', 'transform.encode.features').record
    const answers = { 'profile-categories': true }
    expect(narrow('transform', answers, m, [blocked, open])).toEqual(['plain'])
  })

  it('keeps a record whose blocking rule does not match the answer', () => {
    const blocked = withBlock('no-cats', { has_categoricals: true })
    const answers = { 'profile-categories': false }
    expect(narrow('transform', answers, m, [blocked])).toEqual(['no-cats'])
  })

  it('does not fire a rule on a skipped answer', () => {
    const blocked = withBlock('no-cats', { has_categoricals: true })
    expect(narrow('transform', { 'profile-categories': null }, m, [blocked])).toEqual(['no-cats'])
  })

  it('drops records for another track or task', () => {
    const ts = rec('ts-only', 'transform', 'transform.encode.features', { tracks: ['time-series'] }).record
    const clf = rec('clf-only', 'transform', 'transform.encode.features', {
      rules: { task_types: ['classification'] },
    }).record
    const reg = rec('reg-ok', 'transform', 'transform.encode.features', {
      rules: { task_types: ['regression'] },
    }).record
    expect(narrow('transform', {}, m, [ts, clf, reg])).toEqual(['reg-ok'])
  })

  it('returns only records of the requested stage', () => {
    const other = rec('other', 'select', 'select.filter').record
    const mine = rec('mine', 'transform', 'transform.encode.features').record
    expect(narrow('transform', {}, m, [other, mine])).toEqual(['mine'])
  })

  it('falls back to the full stage list when nothing survives', () => {
    const a = withBlock('a', { has_missing: true })
    const b = withBlock('b', { has_missing: true })
    expect(narrow('transform', { 'profile-missing': true }, m, [a, b])).toEqual(['a', 'b'])
  })

  it('returns an empty list when the stage has no records', () => {
    expect(narrow('tune', {}, m, [])).toEqual([])
  })
})
