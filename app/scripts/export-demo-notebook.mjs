// Writes the demo journey's notebook to a path (used by tests/test_notebook_demo.py).
// Usage: node scripts/export-demo-notebook.mjs <out.ipynb>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { DEMO_PICK_IDS, DEMO_PROFILE } from '../src/build/demoPipeline.ts'
import { buildCells, toIpynb } from '../src/build/notebook.ts'

const items = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'items')
const records = new Map()
for (const stage of readdirSync(items, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const f of readdirSync(join(items, stage.name)).filter((n) => n.endsWith('.yaml'))) {
    const r = load(readFileSync(join(items, stage.name, f), 'utf8'))
    records.set(r.id, r)
  }
}
const picks = DEMO_PICK_IDS.map((id) => ({ record: records.get(id) }))
const out = process.argv[2]
if (!out) throw new Error('usage: export-demo-notebook.mjs <out.ipynb>')
writeFileSync(out, toIpynb(buildCells(DEMO_PROFILE, picks)))
