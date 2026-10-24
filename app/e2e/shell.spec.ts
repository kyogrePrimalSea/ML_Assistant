import { test, expect } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

test('open XGBoost from the catalogue; screenshots in both themes', async ({ page }, info) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await page.getByRole('button', { name: 'Show as list' }).click()
  await page.getByRole('button', { name: /^Boosting \d/ }).click()
  await page.getByRole('link', { name: /XGBoost/ }).first().click()
  await expect(page).toHaveURL(/#\/page\/xgboost$/)
  const panel = page.getByRole('complementary', { name: 'Page panel' })
  await expect(panel).toContainText('xgboost')
  await page.waitForTimeout(400) // let the slide-in finish before measuring
  const box = (await panel.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(420)
  expect(box.width).toBeLessThanOrEqual(560)
  expect(info.project.name).toContain(String(w))

  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: shot(`shell-${w}-${theme}`) })
  }
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/$/)
  await expect(panel).toHaveCount(0)
})

test('search dialog opens with Ctrl+K and reading settings opens', async ({ page }) => {
  await page.goto('./#/')
  const b = (await page.getByRole('button', { name: 'Accessibility settings' }).boundingBox())!
  expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(await page.locator('header').evaluate((h) => h.scrollWidth <= h.clientWidth)).toBe(true)
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Accessibility settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Reading settings' })).toBeVisible()
})

test('the goal sets the track: the list shows what the goal covers', async ({ page }) => {
  await page.goto('./#/')
  await page.getByRole('button', { name: 'Show as list' }).click()
  const before = await page.locator('section[data-stage]').count()
  expect(before).toBe(9)
  await page.getByLabel('What are we trying to do?').selectOption('forecast')
  await expect(page.getByText('Nothing here for this track.').first()).toBeVisible()
  // Only the three v1 goals are offered.
  await expect(page.getByLabel('What are we trying to do?').locator('option')).toHaveCount(3)
})

test('below 900px the panel is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 })
  await page.goto('./#/')
  await page.getByRole('button', { name: 'Show as list' }).click()
  await page.getByRole('button', { name: /^Boosting \d/ }).click()
  await page.getByRole('link', { name: /XGBoost/ }).first().click()
  const sheet = page.getByRole('dialog', { name: 'XGBoost' })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('xgboost')
  const box = (await sheet.boundingBox())!
  expect(box.y + box.height).toBeGreaterThan(790)
  expect(box.width).toBeGreaterThan(780)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('shell-800-sheet') })
})
