import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router'
import { vi } from 'vitest'
import App from '@/App'
import { stubRealData } from '@/test-data'

beforeEach(() => {
  stubRealData()
  // Page records are not under test here; a missing one shows the panel's error message.
  const real = globalThis.fetch
  vi.stubGlobal('fetch', (url: string) => (String(url).includes('/pages/') ? Promise.resolve({ ok: false, status: 404 }) : real(url)))
  window.localStorage.clear()
  window.location.hash = '#/'
})
afterEach(() => vi.unstubAllGlobals())

const open = async () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  await screen.findAllByRole('treeitem')
  await userEvent.keyboard('{Control>}k{/Control}')
  return screen.findByRole('dialog', { name: 'Search' })
}

test('typing announces the count, and Enter on a question shows its answers', async () => {
  const dialog = await open()
  await userEvent.type(within(dialog).getByRole('combobox'), 'rare class')
  expect(await within(dialog).findByRole('status')).toHaveTextContent(/\d+ results?/)
  const options = within(dialog).getAllByRole('option')
  expect(options[0]).toHaveTextContent(/rare/i)
  await userEvent.keyboard('{Enter}')
  expect(window.location.hash).toMatch(/#\/question\/but-rare-class/)
  expect(await screen.findByRole('heading', { name: 'Answers' })).toBeInTheDocument()
})

test('a page result opens its page and the tree path to it', async () => {
  const dialog = await open()
  await userEvent.type(within(dialog).getByRole('combobox'), 'max_depth')
  await userEvent.keyboard('{Enter}')
  expect(window.location.hash).toBe('#/page/max-depth')
  expect(document.querySelector('[role="treeitem"][data-key="max-depth"]')).not.toBeNull()
})

test('a group result opens that node in the tree without a page', async () => {
  const dialog = await open()
  await userEvent.type(within(dialog).getByRole('combobox'), 'outliers')
  await userEvent.click(within(dialog).getByRole('option', { name: /We have outliers/ }))
  expect(document.querySelector('[role="treeitem"][data-key="model.awkward.robust"]')).not.toBeNull()
  expect(document.querySelector('[role="treeitem"][data-key="model.awkward"]')).toHaveAttribute('aria-expanded', 'true')
})

test('Escape closes the dialog', async () => {
  await open()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: 'Search' })).toBeNull()
})
