import { render, screen } from '@testing-library/react'
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
  await userEvent.click(screen.getByRole('radio', { name: 'List' }))
  expect((await screen.findAllByText('Boosting')).length).toBeGreaterThan(0)
  expect(document.querySelectorAll('section[data-stage]').length).toBe(9)
})

test('star field is deterministic', () => {
  expect(makeStars()).toEqual(makeStars())
})
