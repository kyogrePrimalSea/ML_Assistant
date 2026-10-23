import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { rec } from '@/build/fixtures'
import type { ItemRecord } from '@/content/types'
import Journey from './Journey'

// jsdom has no WebGL: the globe constructor throws and the view falls back to the itinerary.
vi.mock('globe.gl', () => ({ default: function Globe() { throw new Error('no webgl') } }))

const records: Record<string, ItemRecord> = {
  'train-test-split': rec('train-test-split', 'split', 'Splitters').record,
  onehotencoder: rec('onehotencoder', 'transform', 'Categorical encoding', {
    rules: { fits_on_data: true, shape_effect: { rows: 'same', columns: 'expands' } },
  }).record,
  xgboost: rec('xgboost', 'model', 'Boosting').record,
  'r2-score': rec('r2-score', 'evaluate', 'Regression metrics', { rules: { task_types: ['regression'] } }).record,
}
vi.mock('@/content/load', () => ({
  loadPage: (id: string) => Promise.resolve({ id, record: records[id], key_setting_facts: {} }),
  useIndex: () => ({ data: null, error: null, loading: false }),
}))

describe('Journey', () => {
  it('lists the route with skipped stages labelled and opens a ticket from the itinerary', async () => {
    render(<MemoryRouter><Journey /></MemoryRouter>)
    const itinerary = await screen.findByTestId('itinerary')
    for (const s of ['Explore', 'Clean', 'Select', 'Tune', 'Interpret']) {
      expect(within(itinerary).getByText(`${s} (skipped)`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('passport')).toHaveTextContent('1,460 × 81')
    expect(await screen.findByText(/WebGL/)).toBeInTheDocument()

    await userEvent.click(within(itinerary).getByRole('button', { name: /onehotencoder/ }))
    const ticket = screen.getByTestId('ticket')
    expect(ticket).toHaveTextContent('Stop 1 of 4')
    expect(ticket).toHaveTextContent('Warning')
    expect(screen.getByTestId('ticket-shape')).toHaveTextContent('1,460 × 81 → 1,460 × 262')

    await userEvent.click(within(ticket).getByRole('button', { name: 'Wrap in a Pipeline' }))
    expect(ticket).toHaveTextContent('Fixed')
  })

  it('opens the notebook with one copy button per code cell', async () => {
    render(<MemoryRouter><Journey /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Open notebook' }))
    expect(screen.getAllByRole('button', { name: 'Copy code' })).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Download .ipynb' })).toBeInTheDocument()
  })
})
