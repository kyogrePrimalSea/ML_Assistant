import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const shot = (name: string) => `/tmp/claude-1000/t024-screens/${name}.png`
const panel = (page: import('@playwright/test').Page) => page.getByRole('complementary', { name: 'Page panel' })

test('XGBoost connections: toggles draw and hide lines; legend; text list', async ({ page }) => {
  const w = page.viewportSize()!.width
  await page.goto('./#/page/xgboost')
  await expect(page.getByRole('treeitem', { name: 'XGBoost, model' })).toBeVisible()
  await expect(page.getByTestId('relationship-lines').locator('[data-rel]')).toHaveCount(0)
  await panel(page).getByRole('button', { name: /Show connections/ }).click()
  // The text list is the accessible equivalent, whatever is drawn.
  await expect(panel(page).getByRole('list', { name: 'Needs connections' })).toContainText('One-hot encoder')
  await expect(panel(page).getByRole('list', { name: 'Pairs with connections' })).toContainText('TreeExplainer')

  for (const t of ['Needs', 'Clashes', 'Pairs with']) await panel(page).getByRole('button', { name: new RegExp(`^${t} \\d`) }).click()
  const lines = page.getByTestId('relationship-lines').locator('[data-rel]')
  await expect(lines.first()).toBeVisible()
  expect(await page.locator('[data-rel="needs"]').count()).toBeGreaterThan(0)
  expect(await page.locator('[data-rel="clashes"]').count()).toBeGreaterThan(0)
  expect(await page.locator('[data-rel="pairs_with"]').count()).toBeGreaterThan(0)
  expect(await page.locator('[data-rel="recommended"]').count()).toBe(0)
  const legend = page.getByRole('group', { name: 'Line legend' })
  await expect(legend).toContainText('Needs')
  await expect(legend).toContainText('Pairs with')
  await expect(legend).not.toContainText('Recommended')
  await page.waitForTimeout(1200)
  for (const theme of ['light', 'dark']) {
    await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: shot(`conn-${w}-${theme}`) })
  }

  await panel(page).getByRole('button', { name: /^Clashes \d/ }).click()
  await expect(page.locator('[data-rel="clashes"]')).toHaveCount(0)
  await expect(legend).not.toContainText('Clashes')
  await panel(page).getByRole('button', { name: /^Needs \d/ }).click()
  await panel(page).getByRole('button', { name: /^Pairs with \d/ }).click()
  await expect(legend).toHaveCount(0)

  const results = await new AxeBuilder({ page }).include('main').include('[aria-label="Page panel"]').analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})

async function labelBoxes(page: import('@playwright/test').Page) {
  // Runs in the browser; written as a string because the e2e project has no DOM types.
  return page.evaluate(`(() => {
    const svg = document.querySelector('svg.rt-svg')
    const c = svg.getBoundingClientRect()
    const out = []
    for (const el of svg.querySelectorAll('text')) {
      const t = el.textContent.trim()
      if (!t || Number(getComputedStyle(el).opacity) < 0.05) continue
      const b = el.getBoundingClientRect()
      if (b.width === 0) continue
      out.push({ t, x1: b.left - c.left, y1: b.top - c.top, x2: b.right - c.left, y2: b.bottom - c.top })
    }
    const lg = document.querySelector('[aria-label="Line legend"]')
    if (lg) {
      const b = lg.getBoundingClientRect()
      out.push({ t: 'legend', x1: b.left - c.left, y1: b.top - c.top, x2: b.right - c.left, y2: b.bottom - c.top })
    }
    return { out, w: c.width, h: c.height }
  })()`) as Promise<{ out: { t: string; x1: number; y1: number; x2: number; y2: number }[]; w: number; h: number }>
}

async function expectLegible(page: import('@playwright/test').Page) {
  const { out, w, h } = await labelBoxes(page)
  expect(out.length).toBeGreaterThan(3)
  const tol = 2
  const problems: string[] = []
  for (const a of out) if (a.x1 < -1 || a.y1 < -1 || a.x2 > w + 1 || a.y2 > h + 1) problems.push(`clipped: ${a.t}`)
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]
      const b = out[j]
      if (a.x1 + tol < b.x2 && b.x1 + tol < a.x2 && a.y1 + tol < b.y2 && b.y1 + tol < a.y2) problems.push(`overlap: ${a.t} / ${b.t}`)
    }
  expect(problems).toEqual([])
}

for (const theme of ['Light', 'Dark']) {
  test(`no label overlaps or is clipped (${theme})`, async ({ page }) => {
    const w = page.viewportSize()!.width
    await page.goto('./#/')
    await page.getByRole('radio', { name: theme }).click()
    await page.getByRole('treeitem', { name: /^Model stage/ }).click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: shot(`legible-${w}-${theme}-a`) })
    await expectLegible(page)

    await page.goto('./#/page/xgboost')
    await expect(page.getByRole('treeitem', { name: 'XGBoost, model' })).toBeVisible()
    await panel(page).getByRole('button', { name: /Show connections/ }).click()
    for (const t of ['Needs', 'Recommended', 'Clashes', 'Pairs with']) await panel(page).getByRole('button', { name: new RegExp(`^${t} \\d`) }).click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: shot(`legible-${w}-${theme}-b`) })
    await expectLegible(page)
  })
}
