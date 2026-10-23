// Stub. T017 replaces this with the real content build.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'index.json'), '{}\n')
