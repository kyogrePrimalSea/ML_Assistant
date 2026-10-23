import { test, expect } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

test('XGBoost hero cutscene plays once, ends on the final fit, replays', async ({ page }) => {
  await page.goto('./#/page/xgboost')
  const hero = page.locator('figure[data-cutscene="boosting-fit"]')
  await expect(hero).toBeVisible()
  await expect(hero).toHaveAttribute('data-state', 'done', { timeout: 5000 })
  await expect(hero).toContainText('tree 5 of 5')
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(hero).toHaveAttribute('data-state', 'playing')
  await expect(hero).toHaveAttribute('data-state', 'done', { timeout: 5000 })
})

test('reduced motion shows the end frame at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/page/xgboost')
  const hero = page.locator('figure[data-cutscene="boosting-fit"]')
  await expect(hero).toHaveAttribute('data-state', 'done')
  await expect(hero).toContainText('tree 5 of 5')
})

for (const theme of ['Light', 'Dark'] as const) {
  test(`screenshots: hero frames ${theme}`, async ({ page }) => {
    await page.goto('./#/page/xgboost')
    await page.getByRole('radio', { name: theme }).click()
    const hero = page.locator('figure[data-cutscene="boosting-fit"]')
    await expect(hero).toHaveAttribute('data-state', 'done', { timeout: 5000 })
    await page.getByRole('button', { name: 'Replay' }).click()
    await hero.screenshot({ path: shot(`cutscene-${theme.toLowerCase()}-1-start`) })
    await page.waitForTimeout(450)
    await hero.screenshot({ path: shot(`cutscene-${theme.toLowerCase()}-2-mid`) })
    await expect(hero).toHaveAttribute('data-state', 'done', { timeout: 5000 })
    await hero.screenshot({ path: shot(`cutscene-${theme.toLowerCase()}-3-end`) })
  })
}
