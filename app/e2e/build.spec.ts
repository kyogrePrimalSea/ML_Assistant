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
  await expect(cards.first().locator('[data-slot="notebook-tag"]')).toHaveText(/Notebook code ready|Notebook cell: TODO/)

  // Globe labels: no "(skipped)" wording, and no two visible stage labels overlap.
  const globe = page.getByTestId('build-globe')
  await expect(globe).not.toContainText('(skipped)')
  const boxes = await globe.locator('.jg-region').evaluateAll((els) =>
    els.flatMap((e) => {
      const r = e.getBoundingClientRect()
      const cs = e.ownerDocument.defaultView!.getComputedStyle(e)
      return r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' ? [{ n: e.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height }] : []
    }),
  )
  expect(boxes.length).toBeGreaterThan(3)
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      expect(overlap, `${a.n} overlaps ${b.n}`).toBe(false)
    }
  }
  expect(await globe.locator('.jg-region[data-state="unpicked"]').first().getAttribute('aria-label')).toContain('Not picked yet')
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
  // Layout: the globe column stays at least 480px wide; under 1200px the page panel overlays the journey panel.
  const main = await page.getByTestId('build-workbench').boundingBox()
  expect(main!.width).toBeGreaterThanOrEqual(480)
  const jb = (await page.getByTestId('build-journey-side').boundingBox())!
  const pb = (await second.boundingBox())!
  if (w < 1200) expect(pb.x + pb.width).toBeLessThanOrEqual(jb.x + jb.width + 1)
  else expect(pb.x).toBeGreaterThanOrEqual(jb.x + jb.width - 1)
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

test('build (beta): optional stages can be skipped on purpose and show it', async ({ page }) => {
  await page.goto('./#/build')
  await page.getByRole('button', { name: /I know my model/ }).click()
  await page.getByRole('searchbox', { name: 'Search models' }).fill('BayesianRidge')
  await page.getByRole('button', { name: /BayesianRidge/ }).click()
  await page.getByRole('button', { name: 'Skip all questions' }).click()
  await page.getByRole('button', { name: /^Clean/ }).click()
  await page.getByRole('button', { name: 'Skip Clean' }).click()
  await expect(page.getByTestId('build-globe').locator('.jg-region[data-state="skipped"]')).toHaveAttribute('aria-label', 'Clean: Skipped')
  await page.getByRole('button', { name: /^Transform/ }).click()
  await expect(page.getByRole('button', { name: /^Skip Transform/ })).toHaveCount(0)
})

test('build (beta): in the full list, at equal mark, pages with notebook code come first', async ({ page }) => {
  await page.goto('./#/build')
  await page.getByRole('button', { name: /I know my model/ }).click()
  await page.getByRole('searchbox', { name: 'Search models' }).fill('BayesianRidge')
  await page.getByRole('button', { name: /BayesianRidge/ }).click()
  await page.getByRole('button', { name: 'Skip all questions' }).click()
  await page.getByRole('button', { name: /^Transform/ }).click()
  await page.getByRole('button', { name: 'Choose from the full list' }).click()
  const rows = await page.getByLabel('Full list').getByTestId('proposal').evaluateAll((els) =>
    els.map((e) => ({ mark: e.getAttribute('data-mark')!, ready: e.querySelector('[data-slot="notebook-tag"]')!.getAttribute('data-ready') === 'true' })),
  )
  expect(rows.length).toBeGreaterThan(10)
  for (const mark of ['green', 'yellow', 'red']) {
    const flags = rows.filter((r) => r.mark === mark).map((r) => r.ready)
    expect(flags, `templated cards come first among ${mark}`).toEqual([...flags].sort((x, y) => Number(y) - Number(x)))
  }
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
