// The built content index and radial layout, for tests that render real views (run after `npm run pretest`).
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { clearContentCache } from '@/content/load'
import type { ContentIndex } from '@/content/types'
import { clearLayoutCache } from '@/views/RadialTree'

export const realIndex = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as ContentIndex
export const realLayout = JSON.parse(readFileSync('public/data/layout-radial.json', 'utf8'))

/** Serve the real index and layout through a stubbed fetch. Pair with `vi.unstubAllGlobals()`. */
export function stubRealData() {
  clearContentCache()
  clearLayoutCache()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('layout-radial') ? realLayout : realIndex),
  })))
}
