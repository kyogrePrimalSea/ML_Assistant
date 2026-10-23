import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

test('journey: select a stop, read its ticket, arrive at the notebook, download it', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await page.getByRole('radio', { name: 'Journey' }).click()

  const journey = page.getByTestId('journey')
  await expect(journey).toBeVisible()
  await expect(page.getByTestId('passport')).toContainText(/regression/i)
  await expect(page.getByTestId('passport')).toContainText('1,460 × 81')

  // Itinerary is the accessible equivalent: 9 stages, skipped ones labelled.
  const itinerary = page.getByTestId('itinerary')
  await expect(itinerary.locator('li[data-stage]')).toHaveCount(9)
  await expect(itinerary).toContainText('Select (skipped)')
  await expect(itinerary).toContainText('Tune (skipped)')
  await expect(itinerary).toContainText('Interpret (skipped)')
  await expect(itinerary.getByText('Warning').first()).toBeVisible()

  // Stop 1 is the one-hot encoder: a leakage warning and the spec's example shape change.
  await itinerary.getByRole('button', { name: /One-hot encoder/ }).click()
  const ticket = page.getByTestId('ticket')
  await expect(ticket).toContainText('Stop 1 of 4')
  await expect(ticket).toContainText('Warning')
  await expect(page.getByTestId('ticket-shape')).toHaveText('1,460 × 81 → 1,460 × 262')
  await expect(ticket.getByRole('link', { name: 'Why did this fire?' })).toBeVisible()
  await page.waitForTimeout(500)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: shot(`journey-${w}-${theme}`) })
  }

  // The one-tap fix turns the stop green.
  await ticket.getByRole('button', { name: 'Wrap in a Pipeline' }).click()
  await expect(ticket).toContainText('Fixed')

  // Selecting a stop on the globe works too.
  await page.getByRole('button', { name: /^Stop 3, XGBoost/ }).click()
  await expect(ticket).toContainText('Stop 3 of 4')

  await page.getByRole('button', { name: 'Open notebook' }).click()
  await expect(page.getByTestId('notebook-view')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy code' })).toHaveCount(5)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: shot(`notebook-${w}-${theme}`) })
  }

  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .ipynb' }).click(),
  ])
  expect(dl.suggestedFilename()).toBe('ml-field-guide-pipeline.ipynb')
  const nb = JSON.parse(readFileSync((await dl.path())!, 'utf8'))
  expect(nb.nbformat).toBe(4)
  expect(nb.cells).toHaveLength(6)
})

test('journey: play once under reduced motion ends at arrival', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/')
  await page.getByRole('radio', { name: 'Journey' }).click()
  await page.getByRole('button', { name: 'Play journey' }).click()
  await expect(page.getByText('You have arrived')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Open the notebook' }).click()
  await expect(page.getByTestId('notebook-view')).toBeVisible()
  await page.getByRole('button', { name: 'Back to the journey' }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
})
