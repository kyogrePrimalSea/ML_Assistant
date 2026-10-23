import { render, screen } from '@testing-library/react'
import { HashRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { clearContentCache } from './content/load'
import { clearLayoutCache } from './views/RadialTree'
import { makeStars } from './shell/StarField'

const index = {
  pages: [
    { id: 'xgboost', plain_name: 'XGBoost', code_name: 'XGBRegressor', stage: 'model', family: 'Boosting (XGBoost)', archetype: 'model', tracks: ['standard'], targets: [], libraries: [], has_record: true, reviewed: false },
    { id: 'ada', plain_name: 'AdaBoost', code_name: 'AdaBoost', stage: 'model', family: 'Boosting (scikit-learn)', archetype: 'model', tracks: ['standard'], targets: [], libraries: [], has_record: false, reviewed: false },
  ],
  questions: [],
  relationships: [],
  vocab: {
    stages: ['explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret'].map((id) => ({ id })),
    archetypes: [],
    tracks: [
      { id: 'standard', name: 'Standard (supervised)', wave: 1 },
      { id: 'causal', name: 'Causal', wave: 'later' },
    ],
  },
}

const layout = {
  version: 1,
  ring: 200,
  tracks: {
    standard: ['explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret'].map((id, i) => ({
      id, angle: 0, x: i * 10, y: i * 10, side: 1, count: id === 'model' ? 2 : 0,
      families: id === 'model' ? [{ name: 'Boosting (XGBoost)', x: 350, y: 0, count: 1, items: [{ id: 'xgboost', x: 630, y: 0 }] }] : [],
    })),
  },
}

beforeEach(() => {
  clearContentCache()
  clearLayoutCache()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => (String(url).includes('layout-radial') ? layout : index) })))
})
afterEach(() => vi.unstubAllGlobals())

test('renders the app title and all nine stages', async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  expect(screen.getByRole('heading', { name: 'ML Field Guide' })).toBeInTheDocument()
  expect(await screen.findAllByRole('treeitem')).toHaveLength(9)
  await userEvent.click(screen.getByRole('radio', { name: 'List' }))
  expect(await screen.findByText('Boosting (XGBoost)')).toBeInTheDocument()
  expect(document.querySelectorAll('section[data-stage]').length).toBe(9)
})

test('star field is deterministic', () => {
  expect(makeStars()).toEqual(makeStars())
})
