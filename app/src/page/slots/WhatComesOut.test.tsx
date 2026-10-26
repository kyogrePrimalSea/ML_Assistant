import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { WhatComesOutBody } from '@/content/types'
import { clearOutputsCache, WhatComesOut, type ToyOutputs } from './WhatComesOut'

const outputs: ToyOutputs = {
  page: 'fx',
  classification: {
    class_names: ['malignant', 'benign'],
    rows: [
      { row: 0, y_true: 1, proba: [0.05, 0.95] },
      { row: 1, y_true: 0, proba: [0.45, 0.55] }, // flips at 0.6
      { row: 2, y_true: 1, proba: [0.15, 0.85] }, // flips at 0.9
      { row: 3, y_true: 0, proba: [0.6, 0.4] }, // flips at 0.3
    ],
  },
  regression: {
    target_transform: 'log1p',
    rows: [{ row: 0, y_true: 200000, y_pred_log: 12.25, y_pred: 208500 }],
  },
}

const body = (visual: WhatComesOutBody['visual']): WhatComesOutBody => ({
  items: [{ name: 'predict_proba', kind: 'method', task: 'classification', shape: '(n_samples, 2)', note: 'Class probabilities.' }],
  next_step: 'Pick a threshold.',
  visual,
})

beforeEach(() => {
  clearOutputsCache()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => outputs })))
})
afterEach(() => vi.unstubAllGlobals())

test('{none: true} renders a titled slot saying None', () => {
  render(<WhatComesOut data={{ none: true }} pageId="fx" />)
  const slot = screen.getByRole('region', { name: 'What comes out' })
  expect(within(slot).getByText('None')).toBeInTheDocument()
})

test('items, next step and the table render', async () => {
  render(<WhatComesOut data={body('proba_table')} pageId="fx" />)
  expect(screen.getByText('predict_proba').tagName).toBe('CODE')
  expect(screen.getByText('Pick a threshold.')).toBeInTheDocument()
  expect(await screen.findByRole('columnheader', { name: /P\(benign\)/ })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: /P\(malignant\)/ })).toBeInTheDocument()
})

test('rich rows label metadata and toggle a fictional example from the keyboard', async () => {
  const user = userEvent.setup()
  const shapeExplanation = 'A table with one row per case and one column per class. The example shape is (2, 2).'
  const rich: WhatComesOutBody = {
    ...body(null),
    items: [{
      name: 'predict_proba',
      kind: 'method',
      task: 'classification',
      shape: '(n_samples, n_classes)',
      note: 'Class probabilities.',
      object_type: 'numpy.ndarray',
      example: '[[0.8, 0.2],\n [0.3, 0.7]]',
      shape_explanation: shapeExplanation,
    }],
    next_step: null,
    guidance: [
      { task: 'classification', text: 'Use scores for ranking metrics.' },
      { task: 'regression', text: 'Reverse a target transform first.' },
    ],
  }
  render(<WhatComesOut data={rich} pageId="fx" />)

  expect(screen.getByText('Kind')).toBeInTheDocument()
  expect(screen.getByText('Method')).toBeInTheDocument()
  expect(screen.getByText('Object type')).toBeInTheDocument()
  expect(screen.getByText('numpy.ndarray')).toBeInTheDocument()
  expect(screen.getByText('Shape')).toBeInTheDocument()
  expect(screen.getByText('How to read this shape')).toBeInTheDocument()
  const explanation = screen.getByText(shapeExplanation)
  expect(explanation).toHaveClass('max-w-prose')
  expect(explanation.className).not.toMatch(/line-clamp|truncate|overflow-hidden/)
  expect((explanation as HTMLElement).style.height).toBe('')
  expect(screen.getByRole('heading', { name: 'Classification' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Regression' })).toBeInTheDocument()

  const show = screen.getByRole('button', { name: 'Show example' })
  show.focus()
  await user.keyboard('{Enter}')
  const hide = screen.getByRole('button', { name: 'Hide example' })
  expect(hide).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Illustrative example')).toBeInTheDocument()
  expect(screen.getByText('Made-up values')).toBeInTheDocument()
  expect(screen.getByLabelText('predict_proba illustrative example')).toHaveTextContent(
    '[[0.8, 0.2],\n [0.3, 0.7]]',
    { normalizeWhitespace: false },
  )
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Show example' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText('Illustrative example')).not.toBeInTheDocument()
})

test('legacy rows retain their compact unlabeled rendering', () => {
  render(<WhatComesOut data={body(null)} pageId="fx" />)
  const row = screen.getByText('predict_proba').closest('li') as HTMLElement
  expect(row).toHaveTextContent('method')
  expect(row).toHaveTextContent('(n_samples, 2)')
  expect(within(row).queryByText('Kind')).not.toBeInTheDocument()
  expect(within(row).queryByText('Object type')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Show example' })).not.toBeInTheDocument()
  expect(screen.queryByText('How to read this shape')).not.toBeInTheDocument()
})

test('a rich row without a shape explanation keeps its prior metadata layout', () => {
  const rich = body(null)
  rich.items = [{ ...rich.items[0], object_type: 'numpy.ndarray', example: '[0.2, 0.8]' }]
  render(<WhatComesOut data={rich} pageId="fx" />)
  expect(screen.getByText('Object type')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Show example' })).toBeInTheDocument()
  expect(screen.queryByText('How to read this shape')).not.toBeInTheDocument()
})

test('captured output follows its snippet and legacy bodies omit it', () => {
  const rich = {
    ...body(null),
    snippet: '# xgboost 3.4.1\nprint("prediction")',
    snippet_library: 'xgboost',
    output: 'classification y_pred: [0 1]\n  regression y_pred: [2.0]',
  }
  const { rerender } = render(<WhatComesOut data={rich} pageId="fx" />)
  const code = screen.getByLabelText('Code')
  const output = screen.getByLabelText('Prediction example output')
  expect(code.compareDocumentPosition(output) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(output).toHaveTextContent(rich.output, { normalizeWhitespace: false })
  expect(output).toHaveAttribute('tabindex', '0')

  rerender(<WhatComesOut data={body(null)} pageId="fx" />)
  expect(screen.queryByText('Output')).not.toBeInTheDocument()
})

test('threshold slider has its label, range and announces the count', async () => {
  const user = userEvent.setup()
  render(<WhatComesOut data={body('proba_table')} pageId="fx" />)
  const thumb = await screen.findByRole('slider', { name: 'Decision threshold' })
  expect(screen.getByText('0 labels changed')).toBeInTheDocument()
  thumb.focus()
  await user.keyboard('{End}') // 0.95
  expect(thumb).toHaveAttribute('aria-valuenow', '0.95')
  expect(screen.getByText('2 labels changed')).toBeInTheDocument()
})

test('slider at 0.9 flips rows 1 and 2', async () => {
  const user = userEvent.setup()
  render(<WhatComesOut data={body('proba_table')} pageId="fx" />)
  const thumb = await screen.findByRole('slider', { name: 'Decision threshold' })
  thumb.focus()
  await user.keyboard('{End}{ArrowLeft}') // 0.90
  expect(thumb).toHaveAttribute('aria-valuenow', '0.9')
  const rows = Array.from(document.querySelectorAll('tr[data-row]'))
  expect(rows.map((r) => r.getAttribute('data-changed'))).toEqual([null, 'true', 'true', null])
  expect(screen.getByText('2 labels changed')).toBeInTheDocument()
  expect(within(rows[1] as HTMLElement).getByText('changed')).toBeInTheDocument()
})

test('undo-log-target switches log units to dollars', async () => {
  const user = userEvent.setup()
  render(<WhatComesOut data={body('regression_preds')} pageId="fx" />)
  expect(await screen.findByText('12.250')).toBeInTheDocument()
  expect(screen.getByText(/Still in log units/)).toBeInTheDocument()
  await user.click(screen.getByRole('switch', { name: 'Undo log target' }))
  expect(screen.getByText('208,500')).toBeInTheDocument()
  expect(screen.queryByText('12.250')).not.toBeInTheDocument()
  expect(screen.queryByText(/Still in log units/)).not.toBeInTheDocument()
})

test('both: defaults to classification, toggle swaps, defaultTask prop respected', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<WhatComesOut data={body('both')} pageId="fx" />)
  expect(await screen.findByRole('slider', { name: 'Decision threshold' })).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Regression' }))
  expect(screen.getByRole('switch', { name: 'Undo log target' })).toBeInTheDocument()
  unmount()
  render(<WhatComesOut data={body('both')} pageId="fx" defaultTask="regression" />)
  expect(await screen.findByRole('switch', { name: 'Undo log target' })).toBeInTheDocument()
})

test('missing outputs file shows the placeholder and does not crash', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
  const { container } = render(<WhatComesOut data={body('proba_table')} pageId="nope" />)
  expect(container.querySelector('[data-frame]')).toBeInTheDocument()
  expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument()
  expect(screen.getByText('predict_proba')).toBeInTheDocument()
})
