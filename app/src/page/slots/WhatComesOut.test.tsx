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
