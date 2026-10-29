import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const shot = (name: string) => `test-results/screens/${name}.png`

test('build (beta): know my model, narrow, pick, read a capsule, open a page, get the notebook', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/')
  await page.getByRole('link', { name: 'Build (beta)' }).click()
  await expect(page).toHaveURL(/#\/build$/)
  await expect(page.getByTestId('build')).toBeVisible()

  await page.getByRole('button', { name: /I know my model/ }).click()
  await page.getByRole('searchbox', { name: 'Search models' }).fill('BayesianRidge')
  await page.getByRole('button', { name: /BayesianRidge/ }).click()
  await expect(page.getByTestId('question')).toBeVisible()
  await page.getByRole('button', { name: 'Skip all questions' }).click()

  await page.getByRole('button', { name: /^Transform/ }).click()
  const cards = page.getByTestId('proposal')
  expect(await cards.count()).toBeGreaterThan(0)
  expect(await cards.count()).toBeLessThanOrEqual(4)
  // Every card carries a mark with an icon and a word, never colour alone.
  await expect(cards.first().locator('[data-slot="mark-chip"]')).toContainText(/Compatible|Not recommended|Incompatible/)

  // Pros and cons open from the keyboard.
  await cards.first().getByRole('button', { name: /^Pros and cons of/ }).focus()
  await expect(page.getByRole('tooltip').first()).toBeVisible()

  const name = await cards.first().getByRole('heading').innerText()
  await cards.first().getByRole('button', { name: /^Add / }).click()
  const capsule = page.getByTestId('capsule-transform')
  await expect(capsule).toContainText(name)

  await capsule.getByRole('button', { expanded: false }).click()
  await capsule.getByRole('button', { name: /^Open the .* page$/ }).click()
  const second = page.getByTestId('build-page-panel')
  await expect(second).toBeVisible()
  await expect(page.getByTestId('build-journey-panel')).toBeVisible()
  await page.waitForTimeout(500)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: shot(`build-${w}-${theme}`) })
  }
  await second.getByRole('button', { name: 'Close' }).click()
  await expect(second).toBeHidden()
  await expect(page.getByTestId('build-journey-panel')).toBeVisible()

  await page.getByRole('button', { name: 'Get notebook' }).click()
  await expect(page.getByTestId('build-notebook')).toBeVisible()
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .ipynb' }).click(),
  ])
  expect(dl.suggestedFilename()).toBe('ml-field-guide-pipeline.ipynb')
  const nb = JSON.parse(readFileSync((await dl.path())!, 'utf8'))
  expect(nb.nbformat).toBe(4)
})

test('build (beta): help me choose a model proposes models and continues into the stages', async ({ page }) => {
  await page.goto('./#/build')
  await page.getByRole('button', { name: /Help me choose a model/ }).click()
  await page.getByRole('button', { name: 'A number' }).click()
  await page.getByRole('button', { name: 'No' }).first().click()
  await page.getByRole('button', { name: 'Show models now' }).click()
  const cards = page.getByTestId('proposal')
  expect(await cards.count()).toBeGreaterThan(0)
  await cards.first().getByRole('button', { name: /^Add / }).click()
  await expect(page.getByRole('navigation', { name: 'Stages' })).toBeVisible()
  await expect(page.getByTestId('capsule-model')).toBeVisible()

  // The existing Journey view is still one click away and unchanged.
  await page.getByRole('radio', { name: 'Journey' }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
})
