import { readFileSync } from 'node:fs'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Hero } from '@/content/types'
import { CutscenePlayer, clearCutsceneCache } from './CutscenePlayer'
import { blend, stepPath } from './scenes/BoostingFit'

const hero: Hero = { kind: 'model', dataset: 'ames', shape: 'fit_line' }
const data = JSON.parse(readFileSync('public/data/cutscenes/boosting-fit.json', 'utf8'))

function setup(reduced: boolean) {
  clearCutsceneCache()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => data })))
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced && q.includes('reduce'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
afterEach(() => vi.unstubAllGlobals())

const player = () => <CutscenePlayer hero={hero} family="model.trees.boosting" fallback={<p>placeholder</p>} />

describe('CutscenePlayer', () => {
  it('keeps the placeholder for heroes without a scene', () => {
    setup(false)
    render(<CutscenePlayer hero={{ kind: 'tuning', dims: 2, trials: 30 }} family="Search" fallback={<p>placeholder</p>} />)
    expect(screen.getByText('placeholder')).toBeInTheDocument()
  })

  it('keeps the placeholder for a non-boosting fit_line page', () => {
    setup(false)
    render(<CutscenePlayer hero={hero} family="Linear models" fallback={<p>placeholder</p>} />)
    expect(screen.getByText('placeholder')).toBeInTheDocument()
    expect(screen.queryByRole('figure')).toBeNull()
  })

  it('plays once, ends on the final fit, and replays on request', async () => {
    setup(false)
    const { rerender } = render(player())
    const fig = await screen.findByRole('figure')
    expect(fig).toHaveAttribute('data-state', 'playing')
    expect(screen.getByRole('button', { name: /replay/i })).toBeDisabled()
    await waitFor(() => expect(fig).toHaveAttribute('data-state', 'done'), { timeout: 3000 })
    expect(screen.getByText('tree 5 of 5')).toBeInTheDocument()
    rerender(player())
    expect(fig).toHaveAttribute('data-state', 'done') // a re-render does not restart it
    await userEvent.click(screen.getByRole('button', { name: /replay/i }))
    expect(fig).toHaveAttribute('data-state', 'playing')
    await waitFor(() => expect(fig).toHaveAttribute('data-state', 'done'), { timeout: 3000 })
  })

  it('shows the end frame straight away under reduced motion', async () => {
    setup(true)
    render(player())
    const fig = await screen.findByRole('figure')
    await waitFor(() => expect(fig).toHaveAttribute('data-state', 'done'))
    expect(screen.getByText('tree 5 of 5')).toBeInTheDocument()
    expect(fig.querySelector('figcaption')?.textContent).toMatch(/five trees/)
    await act(async () => {})
  })
})

describe('BoostingFit helpers', () => {
  it('blends between rounds and builds a step path', () => {
    expect(blend([[0, 0], [1, 1]], 0.5)).toEqual([0.5, 0.5])
    expect(stepPath([0.25, 0.75], [0.2, 0.8])).toMatch(/^M.*L.*L.*L/)
  })
})
