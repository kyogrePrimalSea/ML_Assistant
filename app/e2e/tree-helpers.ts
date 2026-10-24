import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

interface TaxNode { id: string; names_label: string | null; question_label: string | null; question_sentence: string | null; question_prompt: string | null; children: TaxNode[] }
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { taxonomy: { views: Record<string, TaxNode[]>; goals: { id: string }[] } }
const layout = JSON.parse(readFileSync('public/data/layout-radial.json', 'utf8')) as { goals: Record<string, { ring: { id: string; empty?: boolean }[]; fans: Record<string, { children: { id: string }[] }> }> }

export const GOALS = index.taxonomy.goals.map((g) => g.id)
export const nodeOf = (goal: string, id: string) => {
  let found: TaxNode | undefined
  const walk = (n: TaxNode) => {
    if (n.id === id) found = n
    n.children.forEach(walk)
  }
  index.taxonomy.views[goal].forEach(walk)
  return found!
}
export const stagesOf = (goal: string) => index.taxonomy.views[goal].map((s) => s.id)
export const childrenOf = (goal: string, id: string) => layout.goals[goal].fans[id].children.map((c) => c.id)
export const emptyStages = (goal: string) => layout.goals[goal].ring.filter((n) => n.empty).map((n) => n.id)

/** A tree node by id (the accessible names are sentences; ids are stable). */
export const node = (page: Page, id: string) => page.locator(`[role="treeitem"][data-key="${id}"]`)
export const selectGoal = (page: Page, goal: string) => page.getByLabel('What are we trying to do?').selectOption(goal)

/** Open a path of node ids by clicking each. */
export async function openPath(page: Page, ids: string[]) {
  for (const id of ids) await node(page, id).click()
}

/** Bounding boxes of the visible label texts and node dots, relative to the tree canvas. Runs in the browser. */
export function drawn(page: Page) {
  return page.evaluate(`(() => {
    const svg = document.querySelector('svg.rt-svg')
    const c = svg.getBoundingClientRect()
    const out = []
    for (const g of svg.querySelectorAll('[role="treeitem"], [data-extra-for]')) {
      const id = g.getAttribute('data-key') || g.getAttribute('data-extra-for')
      for (const text of g.querySelectorAll('text')) {
        // One box per wrapped line.
        const lines = text.querySelectorAll(':scope > tspan')
        for (const el of lines.length ? lines : [text]) {
          if (!el.textContent.trim()) continue
          const b = el.getBoundingClientRect()
          out.push({ id, t: el.textContent.trim(), x1: b.left - c.left, y1: b.top - c.top, x2: b.right - c.left, y2: b.bottom - c.top })
        }
      }
    }
    return { out, w: c.width, h: c.height }
  })()`) as Promise<{ out: { id: string; t: string; x1: number; y1: number; x2: number; y2: number }[]; w: number; h: number }>
}
