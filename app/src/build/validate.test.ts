import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import {
  legStatus, matchesCondition, sortPicks, stopStatus, validatePipeline, worstStatus, type DataProfile,
} from './validate.ts'

const profile: DataProfile = {
  task_type: 'regression', track: 'standard', has_categoricals: true, has_missing: false,
  time_ordered: false, imbalanced: false,
}
const rules = (r: Record<string, unknown>) => r
const needsEncoder = {
  step: { family: 'Categorical encoding', stage: 'transform' as const }, status: 'required' as const,
  why: 'Text categories must become numbers.', condition: { has_categoricals: true }, unless: { setting: 'enable_categorical', value: true },
}
const ruleIds = (picks: ReturnType<typeof rec>[], p = profile) => validatePipeline(p, picks).map((i) => i.rule)

describe('matchesCondition', () => {
  it('is true for null and checks every key', () => {
    expect(matchesCondition(null, profile)).toBe(true)
    expect(matchesCondition({ has_categoricals: true, task_type: ['regression'] }, profile)).toBe(true)
    expect(matchesCondition({ has_categoricals: true, task_type: ['classification'] }, profile)).toBe(false)
    expect(matchesCondition({ imbalanced: true }, profile)).toBe(false)
  })
})

describe('missing requirement (Block)', () => {
  const model = () => rec('xgb', 'model', 'Boosting', { prep: [needsEncoder] })
  it('fires when categoricals are present and no encoder is picked', () => {
    const [i] = validatePipeline(profile, [model()])
    expect(i).toMatchObject({ rule: 'missing_requirement', severity: 'block', pageId: 'xgb', sourceId: 'xgb' })
    expect(i.message).toContain('categorical encoding')
  })
  it('is satisfied by any page in the family', () => {
    const enc = rec('ohe', 'transform', 'Categorical encoding')
    expect(ruleIds([model(), enc])).not.toContain('missing_requirement')
  })
  it('is skipped when the condition does not match or `unless` holds', () => {
    expect(ruleIds([model()], { ...profile, has_categoricals: false })).toEqual([])
    const picked = { ...model(), settings: { enable_categorical: true } }
    expect(ruleIds([picked])).toEqual([])
  })
  it('names a required page step by the supplied display name', () => {
    const p = rec('scaler', 'transform', 'Scaling', {
      prep: [{ step: { page: 'train-test-split' }, status: 'required', why: 'Fit on training rows only.', condition: null, unless: null }],
    })
    const [i] = validatePipeline(profile, [p], { pageNames: { 'train-test-split': 'Train/test split' } })
    expect(i.message).toContain('Train/test split')
  })
})

describe('wrong for the track (Block)', () => {
  it('fires when the pick excludes the passport track', () => {
    expect(ruleIds([rec('ts', 'split', 'Splitters', { tracks: ['time-series'] })])).toEqual(['wrong_for_track'])
  })
  it('fires when a blocked_when condition matches, and uses its reason', () => {
    const p = rec('kfold', 'split', 'Splitters', {
      rules: rules({ blocked_when: [{ when: { time_ordered: true }, reason: 'Random folds put the future in training.' }] }),
    })
    expect(ruleIds([p])).toEqual([])
    const [i] = validatePipeline({ ...profile, time_ordered: true }, [p])
    expect(i).toMatchObject({ rule: 'wrong_for_track', severity: 'block', message: 'Random folds put the future in training.' })
  })
})

describe('task mismatch (Block)', () => {
  it('fires for R-squared on a classifier, not for task-agnostic picks', () => {
    const r2 = rec('r2', 'evaluate', 'Regression metrics', { rules: { task_types: ['regression'] } })
    expect(ruleIds([r2])).toEqual([])
    expect(ruleIds([r2], { ...profile, task_type: 'classification' })).toEqual(['task_mismatch'])
    expect(ruleIds([rec('any', 'evaluate', 'x')], { ...profile, task_type: 'classification' })).toEqual([])
  })
})

describe('leakage risk (Warn)', () => {
  it('fires for a fitted step in a stage before the split, with a fix', () => {
    const [i] = validatePipeline(profile, [rec('scaler', 'transform', 'Scaling', { rules: { fits_on_data: true } })])
    expect(i).toMatchObject({ rule: 'leakage_risk', severity: 'warn', fix: { label: 'Wrap in a Pipeline' } })
  })
  it('does not fire at or after the split, or for steps that learn nothing', () => {
    expect(ruleIds([rec('m', 'model', 'x', { rules: { fits_on_data: true } })])).toEqual([])
    expect(ruleIds([rec('stateless', 'transform', 'x')])).toEqual([])
  })
})

describe('redundant step (Warn)', () => {
  const model = rec('xgb', 'model', 'Boosting', {
    prep: [{ step: { family: 'Scaling', stage: 'transform' }, status: 'not_needed', why: 'Trees split on order, not size.', condition: null, unless: null }],
  })
  it('flags the unneeded step (not the model) and links to the model page', () => {
    const [i] = validatePipeline(profile, [model, rec('scaler', 'transform', 'Scaling')])
    expect(i).toMatchObject({ rule: 'redundant_step', severity: 'warn', pageId: 'scaler', sourceId: 'xgb' })
  })
  it('is silent when the step is absent', () => {
    expect(ruleIds([model])).toEqual([])
  })
})

describe('missing recommendation (Tip)', () => {
  const model = rec('xgb', 'model', 'Boosting', {
    prep: [{ step: { family: 'Class weighting', stage: 'model' }, status: 'recommended', why: 'Use scale_pos_weight when classes are lopsided.',
      condition: { imbalanced: true, task_type: ['classification'] }, unless: null }],
  })
  it('fires when the condition matches and the step is absent', () => {
    const p = { ...profile, imbalanced: true, task_type: 'classification' as const }
    expect(validatePipeline(p, [model])[0]).toMatchObject({ rule: 'missing_recommendation', severity: 'tip' })
    expect(ruleIds([model])).toEqual([])
  })
})

describe('statuses', () => {
  it('ranks block over warn over tip over valid', () => {
    expect(worstStatus(['valid', 'tip', 'warn'])).toBe('warn')
    expect(worstStatus(['warn', 'block'])).toBe('block')
    expect(worstStatus([])).toBe('valid')
  })
  it('a leg touching a warning is amber, touching a block is red, tips stay green', () => {
    expect(legStatus('valid', 'valid')).toBe('valid')
    expect(legStatus('valid', 'tip')).toBe('valid')
    expect(legStatus('valid', 'warn')).toBe('warn')
    expect(legStatus('warn', 'block')).toBe('block')
  })
  it('a fixed issue stops colouring its stop', () => {
    const issues = validatePipeline(profile, [rec('s', 'transform', 'Scaling', { rules: { fits_on_data: true } })])
    expect(stopStatus('s', issues)).toBe('warn')
    expect(stopStatus('s', issues, new Set([issues[0].key]))).toBe('valid')
  })
  it('sortPicks puts picks in stage order and keeps ties stable', () => {
    const picks = [rec('m', 'model', 'a'), rec('t2', 'transform', 'a'), rec('t1', 'transform', 'b')]
    expect(sortPicks(picks).map((p) => p.record.id)).toEqual(['t2', 't1', 'm'])
  })
})
