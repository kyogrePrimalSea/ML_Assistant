import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const PAGES = ['n-estimators', 'max-depth', 'learning-rate', 'early-stopping']

for (const id of PAGES) {
  test(`${id}: real hero and a working slider, no dashed placeholder`, async ({ page }) => {
    await page.goto(`./#/page/${id}`)
    const hero = page.locator(`figure[data-cutscene="hyper-${id}"]`)
    await expect(hero).toBeVisible()
    await expect(hero).toHaveAttribute('data-state', 'done', { timeout: 5000 })
    const watch = page.locator('[data-slot-name="watch_it_work"]')
    await expect(watch.locator(`[data-watch="hyper-${id}"]`)).toBeVisible()
    await expect(page.locator('[data-slot-name="solves"] [data-frame]')).toHaveCount(0)
    await expect(watch.locator('[data-frame]')).toHaveCount(0)
    const thumb = watch.getByRole('slider')
    const before = await watch.locator('svg path').first().getAttribute('d')
    await thumb.focus()
    await page.keyboard.press('End')
    await expect(watch.locator('svg path').first()).not.toHaveAttribute('d', before!)
    await page.keyboard.press('Home')
    await expect(watch.locator('[data-watch-status]')).not.toBeEmpty()
  })
}

test('n-estimators: keyboard moves the slider and the status flips across the sweet spot', async ({ page }) => {
  await page.goto('./#/page/n-estimators')
  const watch = page.locator('[data-slot-name="watch_it_work"]')
  const thumb = watch.getByRole('slider')
  await thumb.focus()
  await page.keyboard.press('ArrowRight')
  await expect(thumb).toHaveAttribute('aria-valuenow', '51')
  await page.keyboard.press('End')
  await expect(watch.locator('[data-watch-status]')).toContainText('overfitting')
  await page.keyboard.press('Home')
  await expect(watch.locator('[data-watch-status]')).toContainText('underfitting')
})

test('xgboost: Watch it work slider reuses the rounds sweep', async ({ page }) => {
  await page.goto('./#/page/xgboost')
  const watch = page.locator('[data-slot-name="watch_it_work"]')
  await expect(watch.locator('[data-watch="hyper-n-estimators"]')).toBeVisible()
  await expect(watch.locator('[data-frame]')).toHaveCount(0)
})

test('reduced motion: the hero shows its end frame at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/page/max-depth')
  const hero = page.locator('figure[data-cutscene="hyper-max-depth"]')
  await expect(hero).toHaveAttribute('data-state', 'done')
  await expect(hero).toContainText('max_depth = 16')
})

for (const theme of ['Light', 'Dark'] as const) {
  test(`axe finds nothing serious on n-estimators hero and slider (${theme})`, async ({ page }) => {
    await page.goto('./#/page/n-estimators')
    await page.getByRole('radio', { name: theme }).click()
    await expect(page.locator('figure[data-cutscene="hyper-n-estimators"]')).toHaveAttribute('data-state', 'done', { timeout: 5000 })
    const res = await new AxeBuilder({ page }).include('[data-slot-name="solves"]').include('[data-slot-name="watch_it_work"]').analyze()
    expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  })
}
