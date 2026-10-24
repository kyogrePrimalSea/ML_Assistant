// Radial tree layout script (spec 7.1, A5): computed once here, stored, never recomputed in the app.
// Geometry and its documentation live in layout-radial-core.mjs. Reads public/data/index.json and writes
//   ../content/derived/layout-radial.json   (committed, version 2)
//   public/data/layout-radial.json          (served copy)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeLayout } from './layout-radial-core.mjs'

export * from './layout-radial-core.mjs'

const here = dirname(fileURLToPath(import.meta.url))
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataDir = join(here, '..', 'public', 'data')
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'))
  const layout = computeLayout(index)
  const derived = join(here, '..', '..', 'content', 'derived', 'layout-radial.json')
  mkdirSync(dirname(derived), { recursive: true })
  writeFileSync(derived, JSON.stringify(layout) + '\n')
  mkdirSync(dataDir, { recursive: true })
  copyFileSync(derived, join(dataDir, 'layout-radial.json'))
  console.log(`layout-radial: ${Object.keys(layout.goals).length} goals`)
}
