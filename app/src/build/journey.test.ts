import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import { buildJourney, regionRing, stopPosition } from './journey.ts'
import { DEMO_PROFILE } from './demoPipeline.ts'

const start = { rows: 1460, columns: 81 }
const encoder = rec('ohe', 'transform', 'transform.encode.features', { rules: { fits_on_data: true, shape_effect: { rows: 'same', columns: 'expands' } } }).record
const split = rec('split', 'split', 'Splitters').record
const model = rec('xgb', 'model', 'Boosting', {
  prep: [{ step: { family: 'transform.encode.features' }, status: 'required', why: 'Text categories must become numbers.', condition: { has_categoricals: true }, unless: null }],
}).record
const metric = rec('r2', 'evaluate', 'Regression metrics', { rules: { task_types: ['regression'] } }).record

describe('buildJourney', () => {
  it('puts stops in stage order, numbers them and marks untouched stages as skipped', () => {
    const j = buildJourney(DEMO_PROFILE, [metric, model, split, encoder], start)
    expect(j.stops.map((s) => s.record.id)).toEqual(['ohe', 'split', 'xgb', 'r2'])
    expect(j.stops.map((s) => s.n)).toEqual([1, 2, 3, 4])
    expect(j.stages.filter((s) => s.status === 'skipped').map((s) => s.stage))
      .toEqual(['explore', 'clean', 'select', 'tune', 'interpret'])
  })
  it('colours legs: start, amber next to a warning, green elsewhere', () => {
    const j = buildJourney(DEMO_PROFILE, [metric, model, split, encoder], start)
    expect(j.legs.map((l) => l.status)).toEqual(['start', 'warn', 'valid', 'valid'])
    expect(j.legs.map((l) => [l.fromN, l.toN])).toEqual([[0, 1], [1, 2], [2, 3], [3, 4]])
  })
  it('turns legs red around a blocked stop and recovers once the fix is applied', () => {
    const noEncoder = buildJourney(DEMO_PROFILE, [metric, model, split], start)
    expect(noEncoder.stops.find((s) => s.record.id === 'xgb')?.status).toBe('block')
    expect(noEncoder.legs.map((l) => l.status)).toEqual(['start', 'block', 'block'])
    const warned = buildJourney(DEMO_PROFILE, [model, split, encoder], start)
    const key = warned.issues.find((i) => i.rule === 'leakage_risk')!.key
    const fixed = buildJourney(DEMO_PROFILE, [model, split, encoder], start, { fixed: new Set([key]) })
    expect(fixed.legs.map((l) => l.status)).toEqual(['start', 'valid', 'valid'])
  })
  it('tracks the data shape through the route', () => {
    const j = buildJourney(DEMO_PROFILE, [encoder, split], start, { shapeOverrides: { ohe: { columns: 262 } } })
    expect([j.stops[0].before, j.stops[0].after]).toEqual([{ rows: 1460, columns: 81 }, { rows: 1460, columns: 262 }])
  })
})

describe('layout', () => {
  it('spreads stops of one stage in a row and closes region rings', () => {
    expect(stopPosition('model', 0, 1)).toEqual(stopPosition('model', 0, 1))
    expect(stopPosition('model', 0, 2).lng).toBeLessThan(stopPosition('model', 1, 2).lng)
    const ring = regionRing('model')
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })
})
