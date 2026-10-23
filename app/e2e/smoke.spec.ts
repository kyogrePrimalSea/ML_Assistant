import { test, expect } from '@playwright/test'

test('page loads with the right title', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle('ML Field Guide')
  await expect(page.getByRole('heading', { name: 'ML Field Guide' })).toBeVisible()
})
