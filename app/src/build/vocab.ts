// Shared variable vocabulary (spec section 8.1). Every notebook template reads and writes only these
// names, so each cell's output is the next cell's input. A new name needs an edit to this file first.
import type { StageId } from '../content/types.ts'

export interface VocabName {
  name: string
  /** What the variable holds (spec 8.1 table). */
  holds: string
  /**
   * The stage whose cell first assigns the name. The setup cell runs before any stage and is
   * attributed to 'explore', the first stage (where the raw table is first looked at).
   */
  producedBy: StageId
  /** Stages whose templates read the name. */
  consumedBy: StageId[]
}

export const VOCAB: VocabName[] = [
  // Setup cell (the only cell with user edits). X and y are built here so a route with no
  // Clean stop still runs. Spec 8.1 places them after cleaning; a Clean template may redefine them.
  { name: 'df', holds: 'the raw table as loaded', producedBy: 'explore', consumedBy: [] },
  { name: 'target', holds: 'name of the target column (string)', producedBy: 'explore', consumedBy: [] },
  { name: 'numeric_cols', holds: 'names of the number columns (set by the user)', producedBy: 'explore', consumedBy: ['transform'] },
  { name: 'categorical_cols', holds: 'names of the text columns (set by the user)', producedBy: 'explore', consumedBy: ['transform'] },
  { name: 'X', holds: 'features, after the cleaning stage', producedBy: 'explore', consumedBy: ['split'] },
  { name: 'y', holds: 'target values, after the cleaning stage', producedBy: 'explore', consumedBy: ['split'] },
  { name: 'preprocess', holds: 'the ColumnTransformer or Pipeline of transform steps', producedBy: 'transform', consumedBy: ['model'] },
  // Added for chainable templates (T071): the selector is a Pipeline step, not a cell output.
  { name: 'selector', holds: 'the feature selector, fitted inside the Pipeline on training rows', producedBy: 'select', consumedBy: ['model'] },
  { name: 'X_train', holds: 'training features (the split)', producedBy: 'split', consumedBy: ['model', 'tune'] },
  { name: 'X_test', holds: 'held-out features (the split)', producedBy: 'split', consumedBy: ['evaluate', 'interpret'] },
  { name: 'y_train', holds: 'training target (the split)', producedBy: 'split', consumedBy: ['model', 'tune'] },
  { name: 'y_test', holds: 'held-out target (the split)', producedBy: 'split', consumedBy: ['evaluate', 'interpret'] },
  { name: 'cv', holds: 'the cross-validation splitter', producedBy: 'split', consumedBy: ['tune'] },
  { name: 'model', holds: 'the fitted or unfitted estimator', producedBy: 'model', consumedBy: ['tune', 'evaluate', 'interpret'] },
  // Added for chainable templates (T071): the tuned search, whose predict uses the best setting.
  { name: 'search', holds: 'the fitted grid search (predict uses the best setting)', producedBy: 'tune', consumedBy: ['evaluate', 'interpret'] },
  { name: 'y_pred', holds: 'predictions', producedBy: 'evaluate', consumedBy: [] },
  { name: 'y_proba', holds: 'class probabilities', producedBy: 'evaluate', consumedBy: [] },
  { name: 'scores', holds: 'cross-validation scores', producedBy: 'evaluate', consumedBy: [] },
]

export const VOCAB_NAMES: ReadonlySet<string> = new Set(VOCAB.map((v) => v.name))

export const VOCAB_BY_NAME: ReadonlyMap<string, VocabName> = new Map(VOCAB.map((v) => [v.name, v]))
