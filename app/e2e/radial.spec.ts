import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

const stage = (page: Page) => page.getByRole('treeitem', { name: /^Model stage/ })
const group = (page: Page) => page.getByRole('treeitem', { name: /^Trees and ensembles group/ })
const family = (page: Page) => page.getByRole('treeitem', { name: /^Boosting family/ })
const item = (page: Page) => page.getByRole('treeitem', { name: /^XGBoost, model/i })

test('stages only at first; nothing runs off the canvas', async ({ page }) => {
  await page.goto('./#/')
  await expect(page.getByRole('treeitem')).toHaveCount(9)
  const canvas = (await page.getByRole('tree').boundingBox())!
  for (const t of await page.getByRole('treeitem').all()) {
    const b = (await t.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(canvas.x - 1)
    expect(b.x + b.width).toBeLessThanOrEqual(canvas.x + canvas.width + 1)
  }
  await page.screenshot({ path: shot(`tree-${page.viewportSize()!.width}-closed`) })
})

test('open Model, Trees and ensembles, Boosting, XGBoost by mouse; screenshots', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await stage(page).click()
  await expect(stage(page)).toHaveAttribute('aria-expanded', 'true')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: shot(`tree-${w}-stage`) })
  await group(page).click()
  await family(page).click()
  await item(page).click()
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  await expect(page.getByRole('complementary', { name: 'Page panel' })).toContainText('xgboost')
  await page.waitForTimeout(1200)

  // Every visible node stays inside the canvas.
  const canvas = (await page.getByRole('tree').boundingBox())!
  for (const t of await page.getByRole('treeitem').all()) {
    const b = (await t.boundingBox())!
    expect(b.y).toBeGreaterThanOrEqual(canvas.y - 1)
    expect(b.y + b.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1)
  }
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: shot(`tree-${w}-${theme}`) })
  }
})

test('same path by keyboard', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('treeitem', { name: /^Explore stage/ }).focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown')
  await expect(stage(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(stage(page)).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowRight') // into the first group
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown')
  await expect(group(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(family(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await expect(item(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  // Esc inside the tree collapses before it ever closes the panel.
  await item(page).focus()
  await page.keyboard.press('Escape')
  await expect(family(page)).toBeFocused()
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  await page.keyboard.press('Escape')
  await expect(group(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(stage(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('treeitem')).toHaveCount(9)
})

test('track switch re-centres; list toggle works; no axe violations', async ({ page }) => {
  await page.goto('./#/')
  await page.getByLabel('Track').selectOption('time-series')
  await expect(page.getByRole('treeitem', { name: /^Model stage, \d+ pages/ })).toBeVisible()
  await stage(page).click()
  await expect(page.getByRole('treeitem', { name: /^Autoregressive group/ })).toBeVisible()
  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => JSON.stringify(n.any.map((a) => a.message + JSON.stringify(a.data)))).join(" | ")}`)).toEqual([])
  await page.getByRole('radio', { name: 'List' }).click()
  await expect(page.locator('section[data-stage]')).toHaveCount(9)
})
