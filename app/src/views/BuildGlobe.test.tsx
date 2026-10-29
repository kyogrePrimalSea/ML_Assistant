import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { rec } from '@/build/fixtures'
import type { ItemRecord } from '@/content/types'
import { ShellStateProvider } from '@/shell/ShellState'
import BuildGlobe from './BuildGlobe'

// jsdom has no WebGL: the globe constructor throws and the view falls back to the lists.
vi.mock('globe.gl', () => ({ default: function Globe() { throw new Error('no webgl') } }))

const scale = { family: 'transform.scale.rescale' }
const make = (r: ItemRecord, name: string, patch: Partial<ItemRecord['slots']> = {}): ItemRecord => ({
  ...r, plain_name: name, slots: { ...r.slots, ...patch },
})

const ridge = make(
  rec('ridge', 'model', 'model.linear', {
    rules: { task_types: ['regression'] },
    prep: [{ step: scale, status: 'recommended', why: 'Ridge works best on scaled features.', condition: null, unless: null }],
  }).record,
  'Ridge',
  {
    solves: { hero: { kind: 'model', dataset: 'housing', shape: 'fit_line' } as never, line: 'Fits a straight line with shrunk weights.' },
    use_avoid: { use_when: ['wide data'], avoid_when: ['many outliers'] },
    intuition: { idea: 'Keep the weights small so no feature dominates.', analogy: '', animation: '', good_at: [], bad_at: [], vs_siblings: [], read_more: [] } as never,
  },
)
const xgboost = make(
  rec('xgboost', 'model', 'model.boosting', {
    prep: [{ step: scale, status: 'not_needed', why: 'Trees split on order, not size.', condition: null, unless: null }],
  }).record,
  'XGBoost',
)
const scaler = make(rec('scaler', 'transform', 'transform.scale.rescale').record, 'Standard scaling')
const encoder = make(rec('ohe', 'transform', 'transform.encode.features').record, 'One-hot encoder')
const early = make(
  rec('early', 'tune', 'tune.early', {
    prep: [{ step: { family: 'model.boosting' }, status: 'required', why: 'Early stopping needs a boosting model.', condition: null, unless: null }],
  }).record,
  'Early stopping',
)
const records: Record<string, ItemRecord> = Object.fromEntries([ridge, xgboost, scaler, encoder, early].map((r) => [r.id, r]))

const index = {
  pages: Object.values(records).map((r) => ({ id: r.id, plain_name: r.plain_name, stage: r.stage, has_record: true })),
  questions: [], relationships: [],
}
vi.mock('@/content/load', () => ({
  loadPage: (id: string) => Promise.resolve({ id, record: records[id], key_setting_facts: {} }),
  useIndex: () => ({ data: index, error: null, loading: false }),
}))
vi.mock('@/page/PagePanel', () => ({
  PagePanel: ({ id }: { id: string }) => <div>Page body for {id}<a href="#/page/xgboost">Related: XGBoost</a></div>,
}))

function setup() {
  render(<MemoryRouter><ShellStateProvider><BuildGlobe /></ShellStateProvider></MemoryRouter>)
}

async function knowModel(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: /I know my model/ }))
  await userEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
  await userEvent.click(await screen.findByRole('button', { name: 'Skip all questions' }))
}

describe('BuildGlobe entry and flow 1', () => {
  it('offers both entries, searches models, then asks skippable profile questions', async () => {
    setup()
    expect(await screen.findByRole('button', { name: /Help me choose a model/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /I know my model/ }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search models' }), 'xgb')
    expect(screen.queryByRole('button', { name: /Ridge/ })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.click(screen.getByRole('button', { name: /Ridge/ }))
    expect(screen.getByTestId('question')).toHaveTextContent('My data has missing values')
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByTestId('question')).toHaveTextContent('text categories')
    // Picking the model fills the journey panel with a capsule.
    expect(screen.getByTestId('capsule-model')).toHaveTextContent('Ridge')
  })

  it('shows marks with icon and label, and pros and cons in a keyboard-reachable tooltip', async () => {
    setup()
    await knowModel('XGBoost')
    await userEvent.click(screen.getByRole('button', { name: /^Transform/ }))
    const cards = screen.getAllByTestId('proposal')
    const scalerCard = cards.find((c) => c.getAttribute('aria-label') === 'Standard scaling')!
    expect(scalerCard).toHaveAttribute('data-mark', 'yellow')
    expect(within(scalerCard).getByText('Not recommended')).toBeInTheDocument()
    const ohe = cards.find((c) => c.getAttribute('aria-label') === 'One-hot encoder')!
    expect(within(ohe).getByText('Compatible')).toBeInTheDocument()

    // Tab to the info button: the tooltip opens on focus and reports the record data (here: none).
    const info = within(scalerCard).getByRole('button', { name: 'Pros and cons of Standard scaling' })
    info.focus()
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Warning: XGBoost does not need Standard scaling')
    expect(tip).toHaveTextContent('No summary yet')
  })

  it('adds a proposal to the journey, expands its capsule and opens the page in a second panel', async () => {
    setup()
    await knowModel('Ridge')
    await userEvent.click(screen.getByRole('button', { name: /^Transform/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add One-hot encoder' }))
    const capsule = screen.getByTestId('capsule-transform')
    expect(capsule).toHaveTextContent('One-hot encoder')
    await userEvent.click(within(capsule).getByRole('button', { expanded: false }))
    expect(capsule).toHaveTextContent('No summary yet')

    const ridgeCapsule = screen.getByTestId('capsule-model')
    await userEvent.click(within(ridgeCapsule).getByRole('button', { expanded: false }))
    expect(ridgeCapsule).toHaveTextContent('Fits a straight line with shrunk weights.')
    expect(ridgeCapsule).toHaveTextContent('Keep the weights small so no feature dominates.')

    await userEvent.click(within(ridgeCapsule).getByRole('button', { name: 'Open the Ridge page' }))
    const panel = screen.getByTestId('build-page-panel')
    expect(panel).toHaveTextContent('Page body for ridge')
    expect(screen.getByTestId('build-journey-panel')).toBeInTheDocument()

    // A link inside the page swaps the second panel, not the route.
    await userEvent.click(within(panel).getByRole('link', { name: /XGBoost/ }))
    expect(screen.getByTestId('build-page-panel')).toHaveTextContent('Page body for xgboost')

    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByTestId('build-page-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('build-journey-panel')).toBeInTheDocument()
  })

  it('full list shows red picks that need a one-line acknowledgement', async () => {
    setup()
    await knowModel('Ridge')
    await userEvent.click(screen.getByRole('button', { name: /^Tune/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Choose from the full list' }))
    const list = screen.getByLabelText('Full list')
    const card = within(list).getByRole('article', { name: 'Early stopping' })
    expect(card).toHaveAttribute('data-mark', 'red')
    expect(within(card).getByText('Incompatible')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Add Early stopping' }))
    expect(card).toHaveTextContent('Early stopping needs a boosting model')
    await userEvent.click(within(card).getByRole('button', { name: 'Add anyway' }))
    expect(screen.getByTestId('capsule-tune')).toHaveTextContent('Incompatible')
  })

  it('Passport chips are editable and re-validate', async () => {
    setup()
    await knowModel('Ridge')
    const chip = screen.getByRole('button', { name: /No text categories/ })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chip)
    expect(screen.getByRole('button', { name: /Has text categories/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('BuildGlobe flow 2', () => {
  it('asks questions, recommends models with pros and cons, and continues into the stage steps', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /Help me choose a model/ }))
    await userEvent.click(screen.getByRole('button', { name: 'A number' }))
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show models now' }))
    const cards = screen.getAllByTestId('proposal')
    expect(cards.map((c) => c.getAttribute('aria-label'))).toContain('Ridge')
    const ridgeCard = cards.find((c) => c.getAttribute('aria-label') === 'Ridge')!
    within(ridgeCard).getByRole('button', { name: 'Pros and cons of Ridge' }).focus()
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('wide data')
    expect(tip).toHaveTextContent('many outliers')

    await userEvent.click(within(ridgeCard).getByRole('button', { name: 'Add Ridge' }))
    expect(screen.getByTestId('capsule-model')).toHaveTextContent('Ridge')
    expect(screen.getByRole('navigation', { name: 'Stages' })).toBeInTheDocument()
  })
})

describe('BuildGlobe notebook', () => {
  it('Get notebook is never disabled and lists gaps, then downloads an .ipynb', async () => {
    setup()
    const get = await screen.findByRole('button', { name: 'Get notebook' })
    expect(get).toBeEnabled()
    await userEvent.click(get)
    expect(screen.getByTestId('build-notebook')).toHaveTextContent('Nothing picked yet')
    await userEvent.click(screen.getByRole('button', { name: /Back to the journey/ }))

    await knowModel('Ridge')
    await userEvent.click(screen.getByRole('button', { name: /^Transform/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add Standard scaling' }))
    await userEvent.click(screen.getByRole('button', { name: 'Get notebook' }))
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    expect(screen.getByTestId('nb-gaps')).toHaveTextContent('Standard scaling')
    await userEvent.click(screen.getByRole('button', { name: 'Download .ipynb' }))
    expect(create).toHaveBeenCalledTimes(1)
  })
})
