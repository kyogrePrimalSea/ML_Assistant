import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { ShellStateProvider, useShellState } from '@/shell/ShellState'
import type { TaxNode } from '@/content/types'
import { realIndex, stubRealData } from '@/test-data'
import RadialTree from './RadialTree'

const views = realIndex.taxonomy.views
const view = views['predict-number']
const model = view.find((s) => s.id === 'model')!
const trees = model.children.find((c) => c.id === 'model.trees')!
const boosting = trees.children.find((c) => c.id === 'model.trees.boosting')!

/** id to node for one goal view. */
function nodes(goal: string) {
  const out = new Map<string, TaxNode>()
  const walk = (n: TaxNode) => {
    out.set(n.id, n)
    n.children.forEach(walk)
  }
  views[goal].forEach(walk)
  return out
}
const byId = nodes('predict-number')
/** The tree item for a node id: found by its accessible name (the full question sentence). */
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const item = (id: string, map = byId) => {
  const n = map.get(id)!
  return screen.getByRole('treeitem', { name: n.level === 'page' ? new RegExp(`^${n.shown_as},`) : new RegExp(esc(n.question_sentence!)) })
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}
/** Stands in for the top bar's goal selector and labels toggle. */
function Controls() {
  const { setGoal, setLabels } = useShellState()
  return (
    <div>
      <button onClick={() => setLabels('names')}>names</button>
      <button onClick={() => setLabels('questions')}>questions</button>
      <button onClick={() => setGoal('predict-category')}>goal-c</button>
      <button onClick={() => setGoal('predict-number')}>goal-r</button>
      <button onClick={() => setGoal('forecast')}>goal-f</button>
    </div>
  )
}

function setup(path = '/') {
  stubRealData()
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellStateProvider>
        <Controls />
        <RadialTree activeId={path.startsWith('/page/') ? path.slice(6) : undefined} />
        <Where />
      </ShellStateProvider>
    </MemoryRouter>,
  )
}
beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** The name a node shows (its wrapped lines joined, without the page count). */
const shownName = (el: Element) => [...el.querySelectorAll('.rt-name > tspan')].map((t) => (t.firstChild?.textContent ?? '').trim()).join(' ')
/** Counts, pick_when lines and notes drawn beside a tree item. */
const extra = (id: string) => document.querySelector(`[data-extra-for="${id}"]`)!
const centre = () => shownName(screen.getByTestId('rt-centre'))

/** Every node's transform, by id. */
const transforms = () => Object.fromEntries(screen.getAllByRole('treeitem').map((t) => [t.getAttribute('data-key'), t.getAttribute('transform')]))
const camera = () => document.querySelector('g.rt-cam')!.getAttribute('transform')

test('shows the nine stages first, with question labels by default and the full sentence as the name', async () => {
  setup()
  const items = await screen.findAllByRole('treeitem')
  expect(items).toHaveLength(9)
  expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(view.map((s) => `${s.question_label}. ${s.question_sentence}`))
  for (const s of view) expect(shownName(item(s.id))).toBe(s.question_label)
  expect(item('model')).toHaveAttribute('aria-expanded', 'false')
})

test('opens stage, group, family, page by mouse; one path at a time; no raw ids shown', async () => {
  setup()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('treeitem', { name: new RegExp(esc(model.question_sentence!)) }))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length)
  await user.click(item(trees.id))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length + trees.children.length)
  await user.click(item(boosting.id))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + model.children.length + trees.children.length + boosting.children.length)
  for (const t of screen.getAllByRole('treeitem')) expect(t.textContent).not.toMatch(/model\.|transform\./)
  // Opening another stage closes the first path.
  const transform = view.find((s) => s.id === 'transform')!
  await user.click(item('transform'))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9 + transform.children.length)
  await user.click(item('model'))
  await user.click(item(trees.id))
  await user.click(item(boosting.id))
  await user.click(item('xgboost'))
  expect(screen.getByTestId('where')).toHaveTextContent('/page/xgboost')
})

test('the other stages stay labelled while one is open', async () => {
  setup()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('treeitem', { name: new RegExp(esc(model.question_sentence!)) }))
  for (const s of view) {
    const el = item(s.id)
    expect(shownName(el)).toBe(s.question_label)
    expect(el.hasAttribute('data-dim')).toBe(s.id !== 'model')
  }
})

test('keyboard: arrows, Enter, Esc', async () => {
  setup()
  const user = userEvent.setup()
  const first = await screen.findByRole('treeitem', { name: new RegExp(esc(view[0].question_sentence!)) })
  first.focus()
  for (let i = 0; i < 5; i++) await user.keyboard('{ArrowDown}')
  const modelStage = item('model')
  expect(modelStage).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(modelStage).toHaveAttribute('aria-expanded', 'true')
  await user.keyboard('{ArrowRight}')
  expect(item('model.linear')).toHaveFocus()
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{ArrowRight}')
  expect(item('model.trees.single')).toHaveFocus()
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{ArrowRight}')
  expect(item('xgboost')).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('where')).toHaveTextContent('/page/xgboost')
  await user.keyboard('{Escape}')
  expect(item(boosting.id)).toHaveFocus()
  expect(screen.queryByRole('treeitem', { name: /^XGBoost,/ })).toBeNull()
  await user.keyboard('{Escape}{Escape}')
  expect(modelStage).toHaveFocus()
  expect(screen.getAllByRole('treeitem')).toHaveLength(9)
})

test('a page that is open expands its branch; unwritten pages say so; pages show pick_when in Questions mode', async () => {
  setup('/page/lightgbm')
  const el = await screen.findByRole('treeitem', { name: /^LightGBM, / })
  expect(el).toHaveAttribute('aria-selected', 'true')
  expect(within(el).getByText('LightGBM')).toBeInTheDocument()
  expect(extra('lightgbm').textContent).toContain('The same idea, usually')
  expect(within(el).queryByText(/The same idea/)).toBeNull()
  expect(el.getAttribute('aria-label')).toContain('The same idea, usually faster on large data')
  expect(screen.getByRole('treeitem', { name: /^AdaBoost, .*not written yet/ })).toBeInTheDocument()
})

test('Names | Questions changes text only: no node, and not the camera, moves', async () => {
  setup('/page/lightgbm')
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  const before = transforms()
  const cam = camera()
  const questionsText = centre()
  await user.click(screen.getByText('names'))
  expect(transforms()).toEqual(before)
  expect(camera()).toBe(cam)
  expect(centre()).not.toBe(questionsText)
  // Names: stage and family names, and no pick_when under the page.
  expect(shownName(item('model'))).toBe('Model')
  expect(shownName(item('model.trees.boosting'))).toBe('Boosting')
  expect(extra('lightgbm').textContent).toBe('')
  await user.click(screen.getByText('questions'))
  expect(transforms()).toEqual(before)
  expect(camera()).toBe(cam)
  expect(shownName(item('model.trees.boosting'))).toBe(boosting.question_label)
})

test('the label choice is remembered, and storage that throws does not break the tree', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(screen.getByText('names'))
  expect(window.localStorage.getItem('mlfg.labels')).toBe('names')

  const { unmount } = setup()
  unmount()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  document.body.innerHTML = ''
  setup()
  expect(await screen.findAllByRole('treeitem')).toHaveLength(9)
  // Questions is the default when nothing can be read; toggling does not throw.
  expect(shownName(item('model'))).toBe(model.question_label)
  await user.click(screen.getByText('names'))
  expect(shownName(item('model'))).toBe('Model')
})

test('the centre says the open node prompt (Questions) or name (Names); the fallback is "Which one fits?"', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  expect(centre()).toBe('Where are we in the work?')
  await user.click(item('model'))
  expect(centre()).toBe('How should we predict the number?')
  await user.click(item('model.trees'))
  expect(centre()).toBe(trees.question_prompt)
  await user.click(item('model.trees.boosting'))
  expect(boosting.question_prompt).toBeNull()
  expect(centre()).toBe('Which one fits?')
  await user.click(screen.getByText('names'))
  expect(centre()).toBe(boosting.names_label)
  // Closing the stage returns to the root.
  await user.click(item('model'))
  expect(centre()).toBe('Standard · Regression')
})

test('the breadcrumb is a chain of labels in the current mode', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(item('model'))
  await user.click(item('model.trees'))
  await user.click(item('model.trees.boosting'))
  await user.click(item('xgboost'))
  const chain = [model, trees, boosting].map((n) => n.question_label).join(' › ')
  expect(screen.getByText(chain)).toBeInTheDocument()
  await user.click(screen.getByText('names'))
  expect(screen.getByText('Model › Trees and ensembles › Boosting')).toBeInTheDocument()
})

test('switching goal swaps the layout: C has "Rebalance lopsided classes" under Transform, R does not', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(item('transform'))
  const rebalance = () => screen.queryAllByRole('treeitem').some((t) => shownName(t) === 'Rebalance lopsided classes')
  expect(rebalance()).toBe(false)
  const before = transforms()
  await user.click(screen.getByText('goal-c'))
  const c = nodes('predict-category')
  // Transform stays open, the stages stay put, and the new family shows.
  expect(item('transform', c)).toHaveAttribute('aria-expanded', 'true')
  expect(rebalance()).toBe(true)
  for (const s of view) expect(transforms()[s.id]).toBe(before[s.id])
  await user.click(screen.getByText('goal-r'))
  expect(rebalance()).toBe(false)
})

test('a stage with no pages for the goal stays in place, dimmed, with its note', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  const before = transforms().interpret
  await user.click(screen.getByText('goal-f'))
  const interpret = item('interpret', nodes('forecast'))
  expect(transforms().interpret).toBe(before)
  expect(interpret).toHaveAttribute('data-dim', 'true')
  expect(interpret).toHaveAttribute('aria-disabled', 'true')
  expect(extra('interpret').textContent).toBe('Not used for this goal')
})

test('switching to a goal where the open branch does not exist falls back to the ring', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(screen.getByText('goal-c'))
  await user.click(item('interpret', nodes('predict-category')))
  await user.click(item('interpret.monitor', nodes('predict-category')))
  await user.click(screen.getByText('goal-f'))
  expect(screen.getAllByRole('treeitem')).toHaveLength(9)
  expect(item('interpret', nodes('forecast'))).toHaveAttribute('aria-disabled', 'true')
})

test('Show as list shows the catalogue list, with taxonomy names for families, and Show as tree returns', async () => {
  setup()
  const user = userEvent.setup()
  await screen.findAllByRole('treeitem')
  await user.click(screen.getByRole('button', { name: 'Show as list' }))
  expect((await screen.findAllByText('Boosting')).length).toBeGreaterThan(0)
  expect(screen.queryByText(/model\.trees\.boosting/)).toBeNull()
  expect(screen.queryByRole('tree')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Show as tree' }))
  expect(await screen.findAllByRole('treeitem')).toHaveLength(9)
})

test('without ResizeObserver the tree still gets a camera', async () => {
  setup()
  await screen.findAllByRole('treeitem')
  await act(async () => {})
  expect(camera()).toMatch(/^translate\(.+\) scale\(.+\)$/)
})
