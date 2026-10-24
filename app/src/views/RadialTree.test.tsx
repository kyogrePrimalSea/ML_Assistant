import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { ShellStateProvider } from '@/shell/ShellState'
import { realIndex, stubRealData } from '@/test-data'
import RadialTree from './RadialTree'

const view = realIndex.taxonomy.views['predict-number']
const model = view.find((s) => s.id === 'model')!
const trees = model.children.find((c) => c.id === 'model.trees')!
const boosting = trees.children.find((c) => c.id === 'model.trees.boosting')!

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function setup(path = '/') {
  stubRealData()
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

test('shows the nine stages first, named by their names_label', async () => {
  setup()
  const items = await screen.findAllByRole('treeitem')
  expect(items).toHaveLength(9)
  expect(screen.getByRole('treeitem', { name: /^Model stage, \d+ pages/ })).toHaveAttribute('aria-expanded', 'false')
  expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(
    view.map((s) => expect.stringMatching(new RegExp(`^${s.names_label} stage, \\d+ pages`))),
  )
})

test('opens stage, group, family, page by mouse; one path at a time; no raw ids shown', async () => {
  setup()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('treeitem', { name: /^Model stage/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length)
  await user.click(screen.getByRole('treeitem', { name: /^Trees and ensembles group/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length + trees.children.length)
  await user.click(screen.getByRole('treeitem', { name: /^Boosting family/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length + trees.children.length + boosting.children.length)
  for (const t of screen.getAllByRole('treeitem')) expect(t.textContent).not.toMatch(/model\.|transform\./)
  // Opening another stage closes the first path.
  const transform = view.find((s) => s.id === 'transform')!
  await user.click(screen.getByRole('treeitem', { name: /^Transform stage/ }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + transform.children.length)
  await user.click(screen.getByRole('treeitem', { name: /^Model stage/ }))
  await user.click(screen.getByRole('treeitem', { name: /^Trees and ensembles group/ }))
  await user.click(screen.getByRole('treeitem', { name: /^Boosting family/ }))
  await user.click(screen.getByRole('treeitem', { name: /^XGBoost, / }))
  expect(screen.getByTestId('where')).toHaveTextContent('/page/xgboost')
})

test('keyboard: arrows, Enter, Esc', async () => {
  setup()
  const user = userEvent.setup()
  const first = await screen.findByRole('treeitem', { name: /^Explore stage/ })
  first.focus()
  for (let i = 0; i < 5; i++) await user.keyboard('{ArrowDown}')
  const modelStage = screen.getByRole('treeitem', { name: /^Model stage/ })
  expect(modelStage).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(modelStage).toHaveAttribute('aria-expanded', 'true')
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('treeitem', { name: /^Linear models group/ })).toHaveFocus()
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{ArrowRight}')
  expect(screen.getByRole('treeitem', { name: /^Single tree family/ })).toHaveFocus()
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{ArrowRight}')
  expect(screen.getByRole('treeitem', { name: /^XGBoost, / })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('where')).toHaveTextContent('/page/xgboost')
  await user.keyboard('{Escape}')
  expect(screen.getByRole('treeitem', { name: /^Boosting family/ })).toHaveFocus()
  expect(screen.queryByRole('treeitem', { name: /^XGBoost, / })).toBeNull()
  await user.keyboard('{Escape}{Escape}')
  expect(modelStage).toHaveFocus()
  expect(screen.getAllByRole('treeitem')).toHaveLength(9)
})

test('a page that is open expands its branch; unwritten pages say so', async () => {
  setup('/page/lightgbm')
  const item = await screen.findByRole('treeitem', { name: /^LightGBM, / })
  expect(item).toHaveAttribute('aria-selected', 'true')
  expect(within(item).getByText('LightGBM')).toBeInTheDocument()
  expect(screen.getByRole('treeitem', { name: /^AdaBoost, .*not written yet/ })).toBeInTheDocument()
})

test('List toggle shows the catalogue list, with taxonomy names for families', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(screen.getByRole('radio', { name: 'List' }))
  expect((await screen.findAllByText('Boosting')).length).toBeGreaterThan(0)
  expect(screen.queryByText(/model\.trees\.boosting/)).toBeNull()
  expect(screen.queryByRole('tree')).toBeNull()
})
