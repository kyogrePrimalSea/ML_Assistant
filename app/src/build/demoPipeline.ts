// The fixed demo for the short journey (T026). The full builder (E08) replaces this with real picks.
import type { DataProfile } from './validate.ts'
import type { ShapeOverride } from './shape.ts'

export const DEMO_PROFILE: DataProfile = {
  task_type: 'regression',
  track: 'standard',
  has_categoricals: true,
  has_missing: true,
  time_ordered: false,
  imbalanced: false,
}

/** House-prices example from spec 7.3: 1,460 rows by 81 columns. */
export const DEMO_START_SHAPE = { rows: 1460, columns: 81 }

/** Page ids, in the order they were picked. The journey sorts them into stage order. */
export const DEMO_PICK_IDS = ['train-test-split', 'onehotencoder', 'xgboost', 'r2-score']

/**
 * Numbers that depend on data or defaults, not on the record. 262 columns is the spec 7.3
 * example; 1,095 is 75% of 1,460 (train_test_split defaults to a 25% test share).
 */
export const DEMO_SHAPE_OVERRIDES: Record<string, ShapeOverride> = {
  onehotencoder: { columns: 262 },
  'train-test-split': { rows: 1095, note: 'Training rows shown. 365 rows are held out for testing.' },
}
