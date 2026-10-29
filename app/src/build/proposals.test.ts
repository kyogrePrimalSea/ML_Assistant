import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import { fullList, proposeForStage } from './proposals.ts'
import type { DataProfile, Pick } from './validate.ts'
import type { ItemRecord } from '../content/types.ts'

const profile: DataProfile = {
  task_type: 'regression', track: 'standard', has_categoricals: false, has_missing: false,
  time_ordered: false, imbalanced: false,
}
const withCategories: DataProfile = { ...profile, has_categoricals: true }
const timeOrdered: DataProfile = { ...profile, time_ordered: true }

const scale = { family: 'transform.scale.rescale' }
const xgb = () => rec('xgb', 'model', 'model.boosting', {
  prep: [{ step: scale, status: 'not_needed', why: 'Trees split on order, not size.', condition: null, unless: null }],
})
const ridge = () => rec('ridge', 'model', 'model.linear', {
  prep: [{ step: scale, status: 'recommended', why: 'Ridge works best on scaled features.', condition: null, unless: null }],
})
const scaler = () => rec('scaler', 'transform', 'transform.scale.rescale')
const encoder = () => rec('ohe', 'transform', 'transform.encode.features')

/** Replace parts of a record's slots, keeping every other field. */
function withSlots(p: Pick, slots: Partial<ItemRecord['slots']>): Pick {
  return { ...p, record: { ...p.record, slots: { ...p.record.slots, ...slots } } }
}

describe('pros and cons from record fields', () => {
  it('copies use_when and good_at as pros, avoid_when, bad_at and catch_outs as cons, at most 3 each', () => {
    const p = withSlots(rec('lin', 'model', 'model.linear'), {
      use_avoid: { use_when: ['  Small   data\n', 'Linear trend', 'Third', 'Fourth'], avoid_when: ['Non-linear '] },
      intuition: {
        idea: '', analogy: '', animation: '', good_at: ['Fast'], bad_at: ['Curves'], vs_siblings: [], read_more: [],
      },
      catch_outs: ['Forgot to scale'],
    })
    const [proposal] = proposeForStage('model', [], profile, [p.record])
    expect(proposal.pros).toEqual(['Small data', 'Linear trend', 'Third'])
    expect(proposal.cons).toEqual(['Non-linear', 'Curves', 'Forgot to scale'])
  })

  it('returns empty arrays when the record has no summary fields', () => {
    const [proposal] = proposeForStage('model', [], profile, [rec('lin', 'model', 'model.linear').record])
    expect(proposal.pros).toEqual([])
    expect(proposal.cons).toEqual([])
  })

  it('does not invent text: a Text intuition contributes nothing', () => {
    const p = withSlots(rec('lin', 'model', 'model.linear'), { intuition: { text: 'A made-up idea' } })
    const [proposal] = proposeForStage('model', [], profile, [p.record])
    expect(proposal.pros).toEqual([])
    expect(proposal.cons).toEqual([])
  })
})

describe('proposeForStage', () => {
  it('model-driven transform proposals: the encoder is green and comes before the yellow scaler', () => {
    const picks = [xgb()]
    const out = proposeForStage('transform', picks, withCategories, [scaler().record, encoder().record])
    expect(out.map((p) => [p.id, p.mark])).toEqual([['ohe', 'green'], ['scaler', 'yellow']])
    expect(out[1].reasons[0]).toMatchObject({ rule: 'redundant_step', sourceId: 'xgb' })
    expect(out[0].reasons).toEqual([])
  })

  it('with Ridge picked, the scaler is green (its need is met) and not a yellow warning', () => {
    const out = proposeForStage('transform', [ridge()], profile, [scaler().record])
    expect(out).toHaveLength(1)
    expect(out[0].mark).toBe('green')
  })

  it('split stage, time-ordered data: random K-fold (Block) is never proposed first', () => {
    const kfold = rec('kfold', 'split', 'split.kfold', {
      rules: { blocked_when: [{ when: { time_ordered: true }, reason: 'Random K-fold shuffles time-ordered rows.' }] },
    })
    const tsplit = rec('tsplit', 'split', 'split.time')
    const out = proposeForStage('split', [], timeOrdered, [kfold.record, tsplit.record])
    expect(out[0].id).toBe('tsplit')
    expect(out[0].mark).toBe('green')
    const kfoldOut = out.find((p) => p.id === 'kfold')
    expect(kfoldOut?.mark).toBe('red')
    expect(kfoldOut?.reasons[0]).toMatchObject({ rule: 'wrong_for_track', pageId: 'kfold' })
  })

  it('returns at most 4 proposals', () => {
    const records = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => rec(id, 'model', 'model.linear').record)
    expect(proposeForStage('model', [], profile, records)).toHaveLength(4)
  })

  it('leaves out items already picked, and only items of the given stage', () => {
    const out = proposeForStage('model', [xgb()], profile, [xgb().record, ridge().record, scaler().record])
    expect(out.map((p) => p.id)).toEqual(['ridge'])
  })
})

describe('ranking by notebook template', () => {
  it('at equal mark, a templated page outranks an untemplated one even when it is later in the list', () => {
    const plain = rec('zzz-untemplated', 'transform', 'transform.scale.rescale')
    const templated = rec('minmaxscaler', 'transform', 'transform.scale.rescale')
    const out = proposeForStage('transform', [ridge()], profile, [plain.record, templated.record])
    expect(out.map((p) => [p.id, p.mark])).toEqual([['minmaxscaler', 'green'], ['zzz-untemplated', 'green']])
  })

  it('a yellow templated page does not outrank a green untemplated page', () => {
    const yellowTemplated = rec('minmaxscaler', 'transform', 'transform.scale.rescale')
    const greenPlain = rec('zzz-untemplated', 'transform', 'transform.encode.features')
    const out = proposeForStage('transform', [xgb()], withCategories, [yellowTemplated.record, greenPlain.record])
    expect(out.map((p) => [p.id, p.mark])).toEqual([['zzz-untemplated', 'green'], ['minmaxscaler', 'yellow']])
  })

  it('templated ranking applies to the full list too', () => {
    const plain = rec('aaa', 'transform', 'transform.encode.features')
    const templated = rec('onehotencoder', 'transform', 'transform.encode.features')
    expect(fullList('transform', [], profile, [plain.record, templated.record]).map((p) => p.id)).toEqual(['onehotencoder', 'aaa'])
  })
})

describe('fullList', () => {
  it('returns every item of the stage with its mark, green before yellow, picked items included', () => {
    const picks = [xgb()]
    const out = fullList('transform', picks, withCategories, [scaler().record, encoder().record])
    expect(out.map((p) => [p.id, p.mark])).toEqual([['ohe', 'green'], ['scaler', 'yellow']])
  })

  it('includes picked items of the stage', () => {
    const out = fullList('model', [xgb()], profile, [xgb().record, ridge().record])
    expect(out.map((p) => p.id).sort()).toEqual(['ridge', 'xgb'])
  })

  it('is not capped at 4', () => {
    const records = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => rec(id, 'model', 'model.linear').record)
    expect(fullList('model', [], profile, records)).toHaveLength(6)
  })
})
