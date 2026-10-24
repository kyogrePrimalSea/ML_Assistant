import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { node } from './tree-helpers'

const shots = '/tmp/e11-shots/T040'

test('Ctrl+K, "rare class", Enter on a question shows its answers; axe on the dialog', async ({ page }, info) => {
  await page.goto('./#/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox').fill('rare class')
  await expect(dialog.getByRole('status')).toHaveText(/\d+ results?/)
  await expect(dialog.getByRole('option').first()).toContainText(/rare class/i)
  await page.screenshot({ path: `${shots}/${info.project.name}-dialog.png` })
  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(axe.violations).toEqual([])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/question\/but-rare-class/)
  const panel = page.getByRole('complementary', { name: 'Page panel' })
  await expect(panel.getByRole('heading', { name: 'Answers' })).toBeVisible()
  expect(await panel.getByRole('link').count()).toBeGreaterThan(0)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${shots}/${info.project.name}-question.png` })
})

test('a page result flies the tree to the page; a group result opens it; other goals are labelled', async ({ page }, info) => {
  await page.goto('./#/')
  await page.keyboard.press('Control+k')
  await page.getByRole('dialog', { name: 'Search' }).getByRole('combobox').fill('max_depth')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/page\/max-depth$/)
  await expect(node(page, 'max-depth')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${shots}/${info.project.name}-page-flown.png` })
  await page.keyboard.press('Escape')

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await dialog.getByRole('combobox').fill('outliers')
  await dialog.getByRole('option', { name: /We have outliers/ }).first().click()
  await expect(node(page, 'model.awkward.robust')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${shots}/${info.project.name}-group-opened.png` })

  // A forecast-only name searched in the Predict a number goal is listed, under Other goals.
  await page.keyboard.press('Control+k')
  await dialog.getByRole('combobox').fill('arima')
  await expect(dialog.getByText('Other goals')).toBeVisible()
  await expect(dialog.getByText(/Switch goal to/).first()).toBeVisible()
  await page.screenshot({ path: `${shots}/${info.project.name}-other-goals.png` })
})
