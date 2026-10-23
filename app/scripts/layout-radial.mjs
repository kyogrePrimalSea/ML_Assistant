// Radial tree layout (spec 7.1): computed once here, stored, never recomputed in the app.
// Reads public/data/index.json (written by build-content.mjs) and writes
//   ../content/derived/layout-radial.json   (committed)
//   public/data/layout-radial.json          (served copy)
//
// Geometry, in world units with the track at (0, 0), y down:
//   stages    on a ring of radius RING, pipeline order clockwise from the top
//   families  one vertical column at x = side * FAMILY_X, centred on the stage's y
//   items     one vertical column at x = side * ITEM_X, centred on the family's y
// The app draws each column's connector (spine) SPINE units nearer the centre.
// `side` is +1 for stages on the right half and -1 on the left, so columns bloom
// outward and labels (always horizontal) never collide. Order is stable: stages in
// pipeline order, families and items alphabetical.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RING = 200
export const FAMILY_X = 380
export const ITEM_X = 860
/** Distance from a column's spine (the vertical connector) to its nodes. */
export const SPINE = 45
export const GAP = 36
const round = (n) => Math.round(n * 10) / 10

const byName = (a, b) => a.localeCompare(b)

export function computeLayout(index) {
  const stages = index.vocab.stages.map((s) => s.id)
  const tracks = {}
  for (const track of index.vocab.tracks) {
    tracks[track.id] = stages.map((stage, i) => {
      const angle = -90 + (360 / stages.length) * i
      const rad = (angle * Math.PI) / 180
      const x = round(RING * Math.cos(rad))
      const y = round(RING * Math.sin(rad))
      const side = Math.cos(rad) >= -1e-9 ? 1 : -1
      const pages = index.pages.filter((p) => p.stage === stage && p.tracks.includes(track.id))
      const families = new Map()
      for (const p of pages) families.set(p.family, [...(families.get(p.family) ?? []), p])
      const names = [...families.keys()].sort(byName)
      const famY0 = y - ((names.length - 1) * GAP) / 2
      return {
        id: stage,
        angle,
        x,
        y,
        side,
        count: pages.length,
        families: names.map((name, fi) => {
          const items = families.get(name).sort((a, b) => byName(a.plain_name, b.plain_name) || byName(a.id, b.id))
          const fy = famY0 + fi * GAP
          return {
            name,
            x: side * FAMILY_X,
            y: round(fy),
            count: items.length,
            items: items.map((p, ii) => ({
              id: p.id,
              x: side * ITEM_X,
              y: round(fy - ((items.length - 1) * GAP) / 2 + ii * GAP),
            })),
          }
        }),
      }
    })
  }
  return { version: 1, ring: RING, familyX: FAMILY_X, itemX: ITEM_X, spine: SPINE, gap: GAP, tracks }
}

const here = dirname(fileURLToPath(import.meta.url))
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dataDir = join(here, '..', 'public', 'data')
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'))
  const layout = computeLayout(index)
  const derived = join(here, '..', '..', 'content', 'derived', 'layout-radial.json')
  mkdirSync(dirname(derived), { recursive: true })
  writeFileSync(derived, JSON.stringify(layout, null, 1) + '\n')
  mkdirSync(dataDir, { recursive: true })
  copyFileSync(derived, join(dataDir, 'layout-radial.json'))
  console.log(`layout-radial: ${Object.keys(layout.tracks).length} tracks`)
}
