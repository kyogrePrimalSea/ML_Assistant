import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

// Until the T029 content lands the records say {none: true}, so the page JSON is patched in flight.
const BODY = {
  items: [
    { name: 'predict', kind: 'method', task: null, shape: '(n_samples,)', note: 'Hard labels.' },
    { name: 'predict_proba', kind: 'method', task: 'classification', shape: '(n_samples, 2)', note: 'One column per class.' },
  ],
  next_step: 'Pick a threshold that fits the cost of a miss.',
  snippet: "# xgboost 3.4.1\nproba = model.predict_proba(X_test)[:, 1]\n",
  snippet_library: 'xgboost',
  visual: 'both',
}

async function open(page: Page) {
  await page.route('**/data/pages/xgboost.json', async (route) => {
    const res = await route.fetch()
    const json = await res.json()
    json.record.slots.what_comes_out = BODY
    await route.fulfill({ response: res, json })
  })
  await page.goto('./#/page/xgboost')
  const slot = page.locator('[data-slot-name="what_comes_out"]')
  await expect(slot.locator('[data-visual="proba_table"]')).toBeVisible()
  return slot
}

test('xgboost: threshold slider flips labels from the keyboard, undo toggle changes units', async ({ page }) => {
  const slot = await open(page)
  await expect(slot.getByRole('heading', { name: 'What comes out' })).toBeVisible()
  const thumb = slot.getByRole('slider', { name: 'Decision threshold' })
  await expect(slot.locator('[data-flipped-count]')).toHaveText('0 labels changed')
  await thumb.focus()
  await page.keyboard.press('End')
  await expect(thumb).toHaveAttribute('aria-valuenow', '0.95')
  await expect(slot.locator('[data-flipped-count]')).not.toHaveText('0 labels changed')
  await expect(slot.locator('tr[data-changed="true"]').first()).toContainText('changed')

  await slot.getByRole('radio', { name: 'Regression' }).click()
  await expect(slot.getByText(/Still in log units/)).toBeVisible()
  await slot.getByRole('switch', { name: 'Undo log target' }).click()
  await expect(slot.locator('[data-predicted]').first()).toHaveText('99,378')
})

for (const theme of ['Light', 'Dark'] as const) {
  test(`axe finds nothing serious in What comes out (${theme})`, async ({ page }) => {
    const slot = await open(page)
    await page.getByRole('radio', { name: theme }).click()
    const run = () => new AxeBuilder({ page }).include('[data-slot-name="what_comes_out"]').analyze()
    for (const view of ['Classification', 'Regression']) {
      await slot.getByRole('radio', { name: view }).click()
      const res = await run()
      expect(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    }
  })
}

test('pages with None show the titled slot', async ({ page }) => {
  await page.goto('./#/page/standardscaler')
  const slot = page.locator('[data-slot-name="what_comes_out"]')
  await expect(slot.getByRole('heading', { name: 'What comes out' })).toBeVisible()
  await expect(slot.getByText('None')).toBeVisible()
})
