import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

async function setTheme(page: Page, theme: 'Light' | 'Dark') {
  await page.getByRole('radio', { name: theme }).click()
  await page.waitForTimeout(300)
}

// Opens the page panel and loads the whole page; the panel scrolls, so screenshots are of the panel itself.
async function shootPanel(page: Page, id: string, label: string) {
  const w = page.viewportSize()!.width
  await page.goto(`./#/page/${id}`)
  const panel = page.getByRole('complementary', { name: 'Page panel' })
  await expect(panel.getByRole('article')).toBeVisible()
  for (const theme of ['Light', 'Dark'] as const) {
    await setTheme(page, theme)
    // Grow the viewport to the content so one image shows the whole page.
    const scroller = panel.locator('div.overflow-y-auto')
    const h = await scroller.evaluate((el) => el.scrollHeight)
    await page.setViewportSize({ width: w, height: Math.min(h + 120, 6000) })
    await page.waitForTimeout(150)
    await page.screenshot({ path: shot(`page-${label}-${w}-${theme.toLowerCase()}`) })
    await page.setViewportSize({ width: w, height: w === 1440 ? 900 : 768 })
  }
}

for (const [id, label] of [['xgboost', 'xgboost'], ['standardscaler', 'standardscaler'], ['max-depth', 'max-depth']]) {
  test(`screenshots: ${id}`, async ({ page }) => {
    await shootPanel(page, id, label)
  })
}

test('XGBoost page shows the prep rows and effective default; axe finds nothing serious', async ({ page }) => {
  await page.goto('./#/page/xgboost')
  const panel = page.getByRole('complementary', { name: 'Page panel' })
  await expect(panel.getByRole('heading', { level: 2, name: 'XGBoost' })).toBeVisible()
  await expect(panel.getByText('unless enable_categorical=True')).toBeVisible()
  await expect(panel.getByRole('link', { name: 'max_depth' }).locator('xpath=ancestor::li')).toContainText('set as None in the signature')
  await panel.getByRole('button', { name: /Also useful/ }).click()
  await panel.getByRole('button', { name: /Rarely changed/ }).click()
  await panel.getByRole('button', { name: 'Intuition' }).click()
  await panel.getByRole('button', { name: 'Read more' }).click()
  for (const theme of ['Light', 'Dark'] as const) {
    await setTheme(page, theme)
    const results = await new AxeBuilder({ page }).analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(bad, JSON.stringify(bad.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([])
  }
})

test('a link inside the panel opens that page; unknown ids are friendly', async ({ page }) => {
  await page.goto('./#/page/xgboost')
  const panel = page.getByRole('complementary', { name: 'Page panel' })
  await panel.getByRole('link', { name: 'max_depth' }).click()
  await expect(page).toHaveURL(/#\/page\/max-depth$/)
  await expect(panel.getByRole('heading', { level: 2, name: 'Tree depth limit' })).toBeVisible()
  await page.goto('./#/page/nope')
  await expect(panel.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('code block stays inside the panel and scrolls inside itself', async ({ page }) => {
  for (const id of ['xgboost', 'standardscaler']) {
    await page.goto(`./#/page/${id}`)
    const panel = page.getByRole('complementary', { name: 'Page panel' })
    const block = panel.locator('[data-slot="code-block"]').first()
    await expect(block).toBeVisible()
    await page.waitForTimeout(400)
    const p = (await panel.boundingBox())!
    const b = (await block.boundingBox())!
    expect(b.x + b.width).toBeLessThanOrEqual(p.x + p.width)
    expect(b.x).toBeGreaterThanOrEqual(p.x)
  }
})

test('no horizontal overflow in code blocks; numbers are not in the code font', async ({ page }) => {
  for (const id of ['xgboost', 'n-estimators']) {
    await page.goto(`./#/page/${id}`)
    const panel = page.getByRole('complementary', { name: 'Page panel' })
    await expect(panel.getByRole('article')).toBeVisible()
    await page.waitForTimeout(300)
    const over = await panel.locator('[data-slot="code-block"] pre').evaluateAll((els) =>
      els.map((el) => el.scrollWidth - el.clientWidth),
    )
    expect(over.length).toBeGreaterThan(0)
    for (const o of over) expect(o).toBeLessThanOrEqual(1)
  }
  await page.goto('./#/page/n-estimators')
  const cell = page.getByRole('complementary', { name: 'Page panel' }).locator('[data-slot-name="quick_facts"] td').first()
  await expect(cell).toBeVisible()
  expect(await cell.evaluate((el) => (el.ownerDocument.defaultView as unknown as { getComputedStyle(e: unknown): { fontFamily: string } }).getComputedStyle(el).fontFamily)).not.toMatch(/JetBrains/i)
  await page.goto('./#/page/xgboost')
  const ks = page.getByRole('complementary', { name: 'Page panel' }).locator('[data-slot-name="key_settings"] li span.tabular-nums').first()
  await expect(ks).toBeVisible()
  expect(await ks.evaluate((el) => (el.ownerDocument.defaultView as unknown as { getComputedStyle(e: unknown): { fontFamily: string } }).getComputedStyle(el).fontFamily)).not.toMatch(/JetBrains/i)
})

test('phone sheet is named for the page', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('./#/page/xgboost')
  await expect(page.getByRole('dialog', { name: 'XGBoost' })).toBeVisible()
})
