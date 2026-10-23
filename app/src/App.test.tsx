import { render, screen } from '@testing-library/react'
import { HashRouter } from 'react-router'
import { vi } from 'vitest'
import App from './App'
import { clearContentCache } from './content/load'
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
    tracks: [
      { id: 'standard', name: 'Standard (supervised)', wave: 1 },
      { id: 'causal', name: 'Causal', wave: 'later' },
    ],
  },
}

beforeEach(() => {
  clearContentCache()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => index }))
})
afterEach(() => vi.unstubAllGlobals())

test('renders the app title and all nine stages', async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  expect(screen.getByRole('heading', { name: 'ML Field Guide' })).toBeInTheDocument()
  expect(await screen.findByText('Boosting (XGBoost)')).toBeInTheDocument()
  expect(document.querySelectorAll('section[data-stage]').length).toBe(9)
})

test('star field is deterministic', () => {
  expect(makeStars()).toEqual(makeStars())
})
