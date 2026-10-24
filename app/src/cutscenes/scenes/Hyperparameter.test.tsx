import { readFileSync } from 'node:fs'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Hero, WatchItWork as WatchData } from '@/content/types'
import { WatchItWork } from '@/page/slots/WatchItWork'
import { CutscenePlayer, clearCutsceneCache } from '../CutscenePlayer'
import { sceneFor, watchSceneFor } from '../types'
import { HyperView, nearestIndex, STATUS, verdictAt, type HyperData } from './Hyperparameter'

const load = (id: string) => JSON.parse(readFileSync(`public/data/cutscenes/${id}.json`, 'utf8')) as HyperData
const data = load('hyper-n-estimators')

function setup(reduced: boolean) {
  clearCutsceneCache()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const id = /cutscenes\/(.+)\.json/.exec(url)![1]
    return { ok: true, status: 200, json: async () => load(id) }
  }))
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced && q.includes('reduce'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
afterEach(() => vi.unstubAllGlobals())

const hero: Hero = { kind: 'hyperparameter', dataset: 'ames', sweep: [10, 50, 100, 200] }
const watch: WatchData = { dataset: 'ames', control: { name: 'n_estimators', min: 1, max: 200, step: 1, default: 50 } }

describe('scene lookup', () => {
  it('maps hyperparameter pages and boosting models, and nothing else', () => {
    expect(sceneFor(hero, 'Boosting rounds', 'n-estimators')).toBe('hyper-n-estimators')
    expect(sceneFor(hero, 'Boosting rounds', 'some-other-page')).toBeNull()
    expect(watchSceneFor('xgboost', 'Boosting (XGBoost)', 'n_estimators')).toBe('hyper-n-estimators')
    expect(watchSceneFor('hist-gradient-boosting', 'Boosting (scikit-learn)', 'max_iter')).toBe('hyper-n-estimators')
    expect(watchSceneFor('ridge', 'Linear models', 'alpha')).toBeNull()
  })
})

describe('HyperView', () => {
  it('snaps to the nearest stored value and judges it against the best', () => {
    expect(nearestIndex([1, 6, 11], 8)).toBe(1)
    expect(verdictAt(data, nearestIndex(data.sweep_values, 1))).toBe('under')
    expect(verdictAt(data, nearestIndex(data.sweep_values, data.best))).toBe('best')
    expect(verdictAt(data, nearestIndex(data.sweep_values, 200))).toBe('over')
  })

  it('redraws the fit line when the value changes', () => {
    const { container, rerender } = render(<HyperView data={data} value={5} />)
    const d1 = container.querySelector('svg path')!.getAttribute('d')
    rerender(<HyperView data={data} value={200} />)
    expect(container.querySelector('svg path')!.getAttribute('d')).not.toBe(d1)
    expect(screen.getByText('n_estimators = 200')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getAllByText(/Sweet spot/).length).toBeGreaterThan(0)
  })
})

describe('Watch it work slider', () => {
  it('moves with the keyboard and the status text follows the value across the best', async () => {
    setup(false)
    render(<WatchItWork data={watch} pageId="n-estimators" family="Boosting rounds" />)
    const thumb = await screen.findByRole('slider')
    expect(thumb).toHaveAccessibleName(/n_estimators/)
    const status = () => document.querySelector('[data-watch-status]')!.textContent
    expect(status()).toBe(STATUS.best)
    thumb.focus()
    await userEvent.keyboard('{End}')
    expect(thumb).toHaveAttribute('aria-valuenow', '200')
    expect(status()).toBe(STATUS.over)
    expect(document.querySelector('[data-watch-value]')!.textContent).toBe('200')
    await userEvent.keyboard('{Home}')
    expect(status()).toBe(STATUS.under)
    await userEvent.keyboard('{ArrowRight}')
    expect(thumb).toHaveAttribute('aria-valuenow', '2')
    expect(document.querySelector('[data-frame]')).toBeNull()
  })

  it('keeps the placeholder when the page has no data file', () => {
    setup(false)
    render(<WatchItWork data={watch} pageId="ridge" family="Linear models" />)
    expect(document.querySelector('[data-frame]')).not.toBeNull()
    expect(screen.queryByRole('slider')).toBeNull()
  })
})

describe('hyperparameter hero', () => {
  it('shows the static end frame under reduced motion', async () => {
    setup(true)
    render(<CutscenePlayer hero={hero} family="Boosting rounds" pageId="n-estimators" fallback={<p>placeholder</p>} />)
    const fig = await screen.findByRole('figure')
    await waitFor(() => expect(fig).toHaveAttribute('data-state', 'done'))
    expect(screen.getByText('n_estimators = 200')).toBeInTheDocument()
  })

  it('plays through the sweep once and ends on the last value', async () => {
    setup(false)
    render(<CutscenePlayer hero={hero} family="Boosting rounds" pageId="n-estimators" fallback={<p>placeholder</p>} />)
    const fig = await screen.findByRole('figure')
    await waitFor(() => expect(fig).toHaveAttribute('data-state', 'done'), { timeout: 3000 })
    expect(screen.getByText('n_estimators = 200')).toBeInTheDocument()
  })
})
