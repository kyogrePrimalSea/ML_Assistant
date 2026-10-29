import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import { markAll, markFor, overall } from './compat.ts'
import type { DataProfile } from './validate.ts'

const profile: DataProfile = {
  task_type: 'regression', track: 'standard', has_categoricals: false, has_missing: false,
  time_ordered: false, imbalanced: false,
}
const withCategories: DataProfile = { ...profile, has_categoricals: true }

const scale = { family: 'transform.scale.rescale' }
const xgb = () => rec('xgb', 'model', 'model.boosting', {
  prep: [{ step: scale, status: 'not_needed', why: 'Trees split on order, not size.', condition: null, unless: null }],
})
const scaler = () => rec('scaler', 'transform', 'transform.scale.rescale')
const ridge = () => rec('ridge', 'model', 'model.linear', {
  prep: [{ step: scale, status: 'recommended', why: 'Ridge works best on scaled features.', condition: null, unless: null }],
})
const xgbNeedsEncoder = () => rec('xgb-cat', 'model', 'model.boosting', {
  prep: [{
    step: { family: 'transform.encode.features' }, status: 'required',
    why: 'Text categories must become numbers.', condition: { has_categoricals: true },
    unless: { setting: 'enable_categorical', value: true },
  }],
})
const encoder = () => rec('ohe', 'transform', 'transform.encode.features')
const forest = () => rec('rf', 'model', 'model.trees.forest')
const earlyStopping = () => rec('early', 'tune', 'tune.early', {
  prep: [{
    step: { family: 'model.boosting' }, status: 'required',
    why: 'Early stopping needs a boosting model.', condition: null, unless: null,
  }],
})
const leakyScaler = () => rec('scaler-fit', 'transform', 'transform.scale.rescale', { rules: { fits_on_data: true } })

describe('spec 7.3 behaviour examples', () => {
  it('XGBoost plus scaling: the scaler is yellow (Warn, redundant step), linking to the model', () => {
    const r = markFor(scaler(), [xgb()], profile)
    expect(r.mark).toBe('yellow')
    expect(r.severity).toBe('warn')
    expect(r.reasons).toHaveLength(1)
    expect(r.reasons[0]).toMatchObject({ rule: 'redundant_step', pageId: 'scaler', sourceId: 'xgb' })
  })

  it('swapping XGBoost for Ridge removes the scaling warning', () => {
    expect(markFor(scaler(), [ridge()], profile)).toEqual({ mark: 'green', severity: 'none', reasons: [] })
  })

  it('Ridge without scaling is yellow (Tip), and the tip names the reason', () => {
    const r = markFor(ridge(), [], profile)
    expect(r.mark).toBe('yellow')
    expect(r.severity).toBe('tip')
    expect(r.reasons[0]).toMatchObject({ rule: 'missing_recommendation', pageId: 'ridge', sourceId: 'ridge' })
    expect(r.reasons[0].message).toContain('works better with a step from')
    expect(r.reasons[0].message).toContain('Ridge works best on scaled features')
  })

  it('no encoder while the data has categories: the model is red (Block), green once an encoder is picked', () => {
    const red = markFor(xgbNeedsEncoder(), [], withCategories)
    expect(red.mark).toBe('red')
    expect(red.severity).toBe('block')
    expect(red.reasons[0]).toMatchObject({ rule: 'missing_requirement', pageId: 'xgb-cat', sourceId: 'xgb-cat' })
    expect(markFor(xgbNeedsEncoder(), [encoder()], withCategories).mark).toBe('green')
  })

  it('early stopping with a random forest is red (Block)', () => {
    const r = markFor(earlyStopping(), [forest()], profile)
    expect(r.mark).toBe('red')
    expect(r.reasons[0]).toMatchObject({ rule: 'missing_requirement', pageId: 'early', sourceId: 'early' })
  })

  it('a scaler fitted before the split is yellow (Warn, leakage) with its one-tap fix', () => {
    const r = markFor(leakyScaler(), [], profile)
    expect(r.mark).toBe('yellow')
    expect(r.severity).toBe('warn')
    expect(r.reasons[0]).toMatchObject({ rule: 'leakage_risk', fix: { label: 'Wrap in a Pipeline' } })
  })
})

describe('markFor', () => {
  it('is green with no reasons when nothing fires', () => {
    expect(markFor(rec('lin', 'model', 'model.linear'), [], profile)).toEqual({ mark: 'green', severity: 'none', reasons: [] })
  })

  it('ignores issues on other picks that do not involve the candidate', () => {
    expect(markFor(rec('lin', 'model', 'model.linear'), [xgbNeedsEncoder()], withCategories).mark).toBe('green')
  })

  it('gives every non-green result at least one reason with a sourceId', () => {
    for (const r of [markFor(scaler(), [xgb()], profile), markFor(xgbNeedsEncoder(), [], withCategories)]) {
      expect(r.reasons.length).toBeGreaterThan(0)
      for (const i of r.reasons) expect(i.sourceId).toBeTruthy()
    }
  })

  it('a candidate already in picks is not counted twice', () => {
    const once = markFor(scaler(), [xgb()], profile)
    const twice = markFor(scaler(), [xgb(), scaler()], profile)
    expect(twice.mark).toBe(once.mark)
    expect(twice.reasons).toEqual(once.reasons)
  })
})

describe('markAll', () => {
  it('returns one result per candidate, keyed by record id, equal to markFor', () => {
    const picks = [xgb()]
    const all = markAll([scaler(), ridge()], picks, profile)
    expect(Object.keys(all).sort()).toEqual(['ridge', 'scaler'])
    expect(all.scaler).toEqual(markFor(scaler(), picks, profile))
    expect(all.ridge).toEqual(markFor(ridge(), picks, profile))
  })
})

describe('overall', () => {
  it('returns the worst mark: red over yellow over green', () => {
    expect(overall(['green', 'yellow', 'red', 'green'])).toBe('red')
    expect(overall(['green', 'yellow'])).toBe('yellow')
    expect(overall(['green', 'green'])).toBe('green')
  })

  it('is green for an empty list', () => {
    expect(overall([])).toBe('green')
  })
})
