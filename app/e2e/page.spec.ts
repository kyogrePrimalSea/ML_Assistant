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
  await expect(panel.getByRole('link', { name: 'max_depth' }).locator('xpath=ancestor::li')).toContainText('None → 6')
  await panel.getByRole('button', { name: /More settings/ }).click()
  await panel.getByRole('button', { name: /Tier 3 settings/ }).click()
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
