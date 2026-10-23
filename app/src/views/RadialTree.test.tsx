import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'
import { clearContentCache } from '@/content/load'
import { ShellStateProvider } from '@/shell/ShellState'
import RadialTree, { clearLayoutCache } from './RadialTree'
import { computeLayout } from '../../scripts/layout-radial.mjs'

const stageIds = ['explore', 'clean', 'transform', 'select', 'split', 'model', 'tune', 'evaluate', 'interpret']
const page = (id: string, name: string, stage: string, family: string, has_record = false) => ({
  id, plain_name: name, code_name: name, stage, family, archetype: 'model', tracks: ['standard'], targets: [], libraries: [], has_record, reviewed: false,
})
const index = {
  pages: [
    page('ada-boost', 'AdaBoost', 'model', 'Boosting (scikit-learn)'),
    page('xgboost', 'XGBoost', 'model', 'Boosting (XGBoost)', true),
    page('lightgbm', 'LightGBM', 'model', 'Boosting (XGBoost)'),
    page('smote', 'SMOTE', 'transform', 'Resampling'),
  ],
  questions: [],
  relationships: [],
  vocab: {
    stages: stageIds.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })),
    tracks: [{ id: 'standard', name: 'Standard (supervised)', wave: 1 }],
    archetypes: [{ id: 'model', name: 'model' }],
  },
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function setup(path = '/') {
  const layout = computeLayout(index)
  clearContentCache()
  clearLayoutCache()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => (String(url).includes('layout-radial') ? layout : index) })))
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellStateProvider>
        <RadialTree activeId={path.startsWith('/page/') ? path.slice(6) : undefined} />
        <Where />
      </ShellStateProvider>
    </MemoryRouter>,
  )
}
afterEach(() => vi.unstubAllGlobals())

test('shows only the nine stages first, with accessible names', async () => {
  setup()
  const items = await screen.findAllByRole('treeitem')
  expect(items).toHaveLength(9)
  expect(screen.getByRole('treeitem', { name: 'Model stage, 3 pages' })).toHaveAttribute('aria-expanded', 'false')
})

test('opens stage, family, item by mouse; one path at a time', async () => {
  setup()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('treeitem', { name: /^Model stage/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + 2)
  await user.click(screen.getByRole('treeitem', { name: /^Boosting \(XGBoost\) family/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + 2 + 2)
  // Opening another stage closes the first path.
  await user.click(screen.getByRole('treeitem', { name: /^Transform stage/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + 1)
  await user.click(screen.getByRole('treeitem', { name: /^Model stage/ }))
  await user.click(screen.getByRole('treeitem', { name: /^Boosting \(XGBoost\) family/ }))
  await user.click(screen.getByRole('treeitem', { name: 'XGBoost, model' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/page/xgboost')
})

test('keyboard: arrows, Enter, Esc', async () => {
  setup()
  const user = userEvent.setup()
  const first = await screen.findByRole('treeitem', { name: /^Explore stage/ })
  first.focus()
  for (let i = 0; i < 5; i++) await user.keyboard('{ArrowDown}')
  const model = screen.getByRole('treeitem', { name: /^Model stage/ })
  expect(model).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(model).toHaveAttribute('aria-expanded', 'true')
  // Model is on the left half: ArrowLeft goes outward to its first family.
  await user.keyboard('{ArrowLeft}')
  expect(screen.getByRole('treeitem', { name: /^Boosting \(scikit-learn\) family/ })).toHaveFocus()
  await user.keyboard('{ArrowDown}{Enter}{ArrowLeft}')
  expect(screen.getByRole('treeitem', { name: /^LightGBM/ })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('where')).toHaveTextContent('/page/lightgbm')
  await user.keyboard('{Escape}')
  expect(screen.getByRole('treeitem', { name: /^Boosting \(XGBoost\) family/ })).toHaveFocus()
  expect(screen.queryByRole('treeitem', { name: /^LightGBM/ })).toBeNull()
  await user.keyboard('{Escape}')
  expect(model).toHaveFocus()
  expect(screen.getAllByRole('treeitem')).toHaveLength(9)
})

test('a page that is open expands its branch; unwritten pages say so', async () => {
  setup('/page/lightgbm')
  const item = await screen.findByRole('treeitem', { name: 'LightGBM, model, not written yet' })
  expect(item).toHaveAttribute('aria-selected', 'true')
  expect(within(item).getByText('LightGBM')).toBeInTheDocument()
})

test('List toggle shows the catalogue list', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(screen.getByRole('radio', { name: 'List' }))
  expect(await screen.findByText('Resampling')).toBeInTheDocument()
  expect(screen.queryByRole('tree')).toBeNull()
})
