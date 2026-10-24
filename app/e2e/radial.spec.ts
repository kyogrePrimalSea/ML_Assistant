import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { GOALS, childrenOf, drawn, emptyStages, node, nodeOf, openPath, selectGoal, stagesOf } from './tree-helpers'

const shot = (name: string) => `test-results/screens/${name}.png`
const shotT039 = (name: string) => `/tmp/e11-shots/T039/${name}.png`
const MODEL_PATH = ['model', 'model.trees', 'model.trees.boosting']

/** The tree node's box in canvas coordinates. */
async function box(page: Page, id: string) {
  const c = (await page.getByRole('tree').boundingBox())!
  const b = (await node(page, id).boundingBox())!
  return { x1: b.x - c.x, y1: b.y - c.y, x2: b.x - c.x + b.width, y2: b.y - c.y + b.height, w: c.width, h: c.height }
}
/** Every drawn label text must clear every other. */
async function expectNoOverlaps(page: Page) {
  const { out } = await drawn(page)
  const problems: string[] = []
  const tol = 2
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]
      const b = out[j]
      if (a.x1 + tol < b.x2 && b.x1 + tol < a.x2 && a.y1 + tol < b.y2 && b.y1 + tol < a.y2) problems.push(`${a.t} / ${b.t}`)
    }
  expect(problems).toEqual([])
}

test('stages only at first; nothing runs off the canvas', async ({ page }) => {
  await page.goto('./#/')
  await expect(page.getByRole('treeitem')).toHaveCount(9)
  await page.waitForTimeout(300)
  const canvas = (await page.getByRole('tree').boundingBox())!
  for (const t of await page.getByRole('treeitem').all()) {
    const b = (await t.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(canvas.x - 1)
    expect(b.x + b.width).toBeLessThanOrEqual(canvas.x + canvas.width + 1)
  }
  await page.screenshot({ path: shot(`tree-${page.viewportSize()!.width}-closed`) })
})

test('open Model, Trees and ensembles, Boosting, XGBoost by mouse; every child is in view or has an edge indicator', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await node(page, 'model').click()
  await expect(node(page, 'model')).toHaveAttribute('aria-expanded', 'true')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: shot(`tree-${w}-stage`) })
  await openPath(page, ['model.trees', 'model.trees.boosting'])
  await node(page, 'xgboost').click()
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  await expect(page.getByRole('complementary', { name: 'Page panel' })).toContainText('xgboost')
  await page.waitForTimeout(1200)

  // The open family is inside the canvas. Each of its pages is either inside, or the side it is cut on has
  // an indicator that says how many more there are.
  const family = await box(page, 'model.trees.boosting')
  expect(family.x1).toBeGreaterThanOrEqual(-1)
  expect(family.x2).toBeLessThanOrEqual(family.w + 1)
  expect(family.y1).toBeGreaterThanOrEqual(-1)
  expect(family.y2).toBeLessThanOrEqual(family.h + 1)
  let cutLeft = 0
  let cutRight = 0
  for (const id of childrenOf('predict-number', 'model.trees.boosting')) {
    const b = await box(page, id)
    if (b.x1 < -1) cutLeft++
    if (b.x2 > b.w + 1) cutRight++
    expect(b.y1).toBeGreaterThanOrEqual(-1)
    expect(b.y2).toBeLessThanOrEqual(b.h + 1)
  }
  if (cutLeft) await expect(page.getByTestId('more-left')).toContainText(`${cutLeft} more`)
  else await expect(page.getByTestId('more-left')).toHaveCount(0)
  if (cutRight) await expect(page.getByTestId('more-right')).toContainText(`${cutRight} more`)
  else await expect(page.getByTestId('more-right')).toHaveCount(0)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: shot(`tree-${w}-${theme}`) })
  }
})

test('same path by keyboard; focus brings the label into view', async ({ page }) => {
  await page.goto('./#/')
  await node(page, 'explore').focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown')
  await expect(node(page, 'model')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(node(page, 'model')).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowRight') // into the first group
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown')
  await expect(node(page, 'model.trees')).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(node(page, 'model.trees.boosting')).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await expect(node(page, 'xgboost')).toBeFocused()
  // Walk the whole fan: every focused page has its whole label inside the canvas.
  for (const id of childrenOf('predict-number', 'model.trees.boosting')) {
    await node(page, id).focus()
    await page.waitForTimeout(1000)
    const b = await box(page, id)
    expect(b.x1, id).toBeGreaterThanOrEqual(-1)
    expect(b.x2, id).toBeLessThanOrEqual(b.w + 1)
    expect(b.y1, id).toBeGreaterThanOrEqual(-1)
    expect(b.y2, id).toBeLessThanOrEqual(b.h + 1)
  }
  await node(page, 'xgboost').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  // Esc inside the tree collapses before it ever closes the panel.
  await node(page, 'xgboost').focus()
  await page.keyboard.press('Escape')
  await expect(node(page, 'model.trees.boosting')).toBeFocused()
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  await page.keyboard.press('Escape')
  await expect(node(page, 'model.trees')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(node(page, 'model')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('treeitem')).toHaveCount(9)
})

for (const goal of GOALS) {
  test(`goal ${goal}: Model opens with at most 7 children, each attached to Model, and the other 8 stages stay labelled`, async ({ page }) => {
    await page.goto('./#/')
    await selectGoal(page, goal)
    await node(page, 'model').click()
    await page.waitForTimeout(1000)
    const kids = childrenOf(goal, 'model')
    expect(kids.length).toBeGreaterThan(0)
    expect(kids.length).toBeLessThanOrEqual(7)
    for (const id of kids) {
      await expect(node(page, id)).toHaveCount(1)
      await expect(page.locator(`path[data-parent="model"][data-child="${id}"]`)).toHaveCount(1)
    }
    for (const s of stagesOf(goal).filter((s) => s !== 'model')) {
      const el = node(page, s)
      await expect(el).toHaveAttribute('data-dim', 'true')
      // Still labelled (the count follows the name in the same text element).
      await expect(el.locator('text.rt-name')).toContainText(nodeOf(goal, s).question_label!.split(' ')[0])
    }
    for (const s of emptyStages(goal)) await expect(page.locator(`[data-extra-for="${s}"]`)).toContainText('Not used for this goal')
    await page.screenshot({ path: shotT039(`goal-${goal}-model-${page.viewportSize()!.width}`) })
  })
}

test('Tune > settings > training: attached fan, no label overlaps, in both themes', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await openPath(page, ['tune', 'tune.settings', 'tune.settings.training'])
  await page.waitForTimeout(1200)
  for (const id of childrenOf('predict-number', 'tune.settings.training')) {
    await expect(page.locator(`path[data-parent="tune.settings.training"][data-child="${id}"]`)).toHaveCount(1)
  }
  await expectNoOverlaps(page)
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: theme }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: shotT039(`F1-tune-settings-training-${w}-${theme.toLowerCase()}`) })
  }
})

test('Names and Questions: every node box is unchanged; the camera does not move', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await openPath(page, MODEL_PATH)
  await page.waitForTimeout(1200)
  const snapshot = async () => {
    const out: Record<string, string> = {}
    for (const t of await page.getByRole('treeitem').all()) {
      // The stored label box (the transparent hit area) and the dot: the parts that must not move.
      for (const part of ['rect', 'circle.rt-disc']) {
        const b = (await t.locator(part).first().boundingBox())!
        out[`${await t.getAttribute('data-key')} ${part}`] = [b.x, b.y, b.width, b.height].map((v) => v.toFixed(1)).join(',')
      }
    }
    return { out, cam: await page.locator('g.rt-cam').getAttribute('transform') }
  }
  await page.screenshot({ path: shotT039(`names-vs-questions-${w}-questions`) })
  const q = await snapshot()
  await page.getByRole('radio', { name: 'Names' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: shotT039(`names-vs-questions-${w}-names`) })
  const n = await snapshot()
  expect(n.cam).toBe(q.cam)
  // The node group's box covers its dot and the stored label box, which are the same in both sets.
  expect(n.out).toEqual(q.out)
  await page.getByRole('radio', { name: 'Questions' }).click()
  expect((await snapshot()).out).toEqual(q.out)
})

test('the label choice survives a reload', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('radio', { name: 'Names' }).click()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Names' })).toBeChecked()
  await expect(node(page, 'model').locator('text.rt-name')).toContainText('Model')
})

test('goal switch R to C on Transform keeps the stages and adds the rebalance family', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await node(page, 'transform').click()
  await page.waitForTimeout(1000)
  await expect(node(page, 'transform.rebalance')).toHaveCount(0)
  await page.screenshot({ path: shotT039(`goal-switch-${w}-1-regression`) })
  const model = (await node(page, 'model').boundingBox())!
  await selectGoal(page, 'predict-category')
  await page.waitForTimeout(1200)
  await expect(node(page, 'transform.rebalance')).toHaveCount(1)
  const after = (await node(page, 'model').boundingBox())!
  // The camera may have moved for the new fan, but the nine stages are all still there and labelled.
  await expect(page.getByRole('treeitem')).toHaveCount(9 + childrenOf('predict-category', 'transform').length)
  expect(after.width).toBeGreaterThan(0)
  expect(model.width).toBeGreaterThan(0)
  await page.screenshot({ path: shotT039(`goal-switch-${w}-2-classification`) })
})

test('drag pans the camera, and a drag does not open a node', async ({ page }) => {
  await page.goto('./#/')
  await node(page, 'model').click()
  await page.waitForTimeout(1000)
  const before = await page.locator('g.rt-cam').getAttribute('transform')
  const c = (await page.getByRole('tree').boundingBox())!
  // Start on a node and drag: the camera moves and nothing toggles.
  const m = (await node(page, 'model.linear').boundingBox())!
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
  await page.mouse.down()
  await page.mouse.move(m.x + m.width / 2 + 40, m.y + m.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  expect(await page.locator('g.rt-cam').getAttribute('transform')).not.toBe(before)
  await expect(node(page, 'model.linear')).toHaveAttribute('aria-expanded', 'false')
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2)
  await page.mouse.wheel(0, 60)
  await page.waitForTimeout(100)
  expect(await page.locator('g.rt-cam').getAttribute('transform')).not.toBe(before)
})

test('an edge indicator pans toward the children that are out of view', async ({ page }) => {
  // Narrow canvas: a fan that cannot be seen at once. Predict a number > Fit a line, but the data is awkward is wide.
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('./#/page/xgboost') // opens the Boosting family with the panel (604px canvas)
  await expect(node(page, 'xgboost')).toBeVisible()
  await page.waitForTimeout(1200)
  const side = (await page.getByTestId('more-left').count()) ? 'left' : (await page.getByTestId('more-right').count()) ? 'right' : null
  test.skip(side === null, 'every Boosting page is in view at this size')
  const before = await page.locator('g.rt-cam').getAttribute('transform')
  await page.getByTestId(`more-${side}`).click()
  await page.waitForTimeout(1200)
  expect(await page.locator('g.rt-cam').getAttribute('transform')).not.toBe(before)
})

test('goal selector and no axe violations', async ({ page }) => {
  await page.goto('./#/')
  await selectGoal(page, 'forecast')
  await expect(page.locator('[data-extra-for="interpret"]')).toContainText('Not used for this goal')
  await node(page, 'model').click()
  await expect(page.getByRole('treeitem', { name: /We need a model that makes the prediction/ })).toBeVisible()
  await expect(node(page, 'model.ts-past')).toHaveCount(1)
  await expect(node(page, 'model.linear')).toHaveCount(0)
  await page.waitForTimeout(1000)
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: theme }).click()
    await page.waitForTimeout(500) // let the theme colours settle before axe samples them
    const results = await new AxeBuilder({ page }).include('main').include('header').analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => JSON.stringify(n.any.map((a) => a.message + JSON.stringify(a.data)))).join(' | ')}`)).toEqual([])
  }
  await page.getByRole('button', { name: 'Show as list' }).click()
  await expect(page.locator('section[data-stage]')).toHaveCount(9)
})
