import { render, screen, within } from '@testing-library/react'
import { HashRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App from './App'
import { stubRealData } from './test-data'
import { makeStars } from './shell/StarField'

beforeEach(() => stubRealData())
afterEach(() => vi.unstubAllGlobals())

test('renders the app title and all nine stages', async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  expect(screen.getByRole('heading', { name: 'ML Field Guide' })).toBeInTheDocument()
  expect(await screen.findAllByRole('treeitem')).toHaveLength(9)
  await userEvent.click(screen.getByRole('button', { name: 'Show as list' }))
  expect((await screen.findAllByText('Boosting')).length).toBeGreaterThan(0)
  expect(document.querySelectorAll('section[data-stage]').length).toBe(9)
})

test('the top bar asks the goal question and carries the Names | Questions toggle', async () => {
  window.localStorage.clear()
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  await screen.findAllByRole('treeitem')
  const goal = screen.getByRole('combobox', { name: 'What are we trying to do?' })
  expect(within(goal).getAllByRole('option').map((o) => o.textContent)).toEqual(['Predict a number', 'Sort things into categories', 'Forecast what comes next'])
  expect(screen.getByRole('radio', { name: 'Questions' })).toBeChecked()
  await userEvent.click(screen.getByRole('radio', { name: 'Names' }))
  expect(within(goal).getAllByRole('option').map((o) => o.textContent)).toEqual(['Standard · Regression', 'Standard · Classification', 'Time series'])
  await userEvent.selectOptions(goal, 'predict-category')
  expect(goal).toHaveValue('predict-category')
  window.localStorage.clear()
})

test('star field is deterministic', () => {
  expect(makeStars()).toEqual(makeStars())
})
