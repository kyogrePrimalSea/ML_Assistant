// Radial tree layout (spec 7.1, A5); the pure geometry, with no node imports so the app can share METRICS
// and wrapText. layout-radial.mjs adds the file I/O. Computed once at build time, stored, never recomputed in the app.
// Input: the content index (`taxonomy.views` holds one elided view tree per goal). Output: the layout
// object stored as content/derived/layout-radial.json (version 2).
//
// Geometry, in world units with the centre at (0, 0), y down, angles in degrees (0 = right,
// 90 = down, so increasing angles run clockwise):
//   stages   9 fixed slots on a ring of radius RING, pipeline order clockwise from the top, the
//            same in every goal. A stage with no pages for the goal is `empty`.
//   fans     for every non-page node with children, the positions of its children for the state
//            where that node is open: a sector centred on the node's own angle, outward from it.
//            n children share a sector of fanSector(n) degrees (capped at SECTOR_MAX), in reading
//            order (top to bottom, or left to right at the top and bottom of the ring).
//   boxes    every node has a label box sized for the larger of the Names and Questions label
//            sets, so toggling the sets moves nothing.
//   fits     per open node, the bounding box of the stage ring plus the whole opened path.
// Collisions are resolved here: a child starts at the base radius and moves outward along its ray
// until its label box clears the stage ring, the centre, the opened ancestors and its siblings.
export const RING = 290
/** Radial distance from an opened node to the first try for its children. */
export const FAN_STEP = 150
export const RADIUS_STEP = 6
export const SECTOR_MAX = 120
const SECTOR_BASE = 20
const SECTOR_PER_CHILD = 16

/** Label metrics (px at scale 1). Character widths are generous so wider reading fonts still fit. */
export const METRICS = {
  stage: { font: 16, bold: true, wrap: 22, dot: 20 },
  node: { font: 15, bold: true, wrap: 24, dot: 9 },
  page: { font: 15, bold: false, wrap: 28, dot: 12 },
  pick: { font: 13, bold: false, wrap: 34 },
  note: { font: 13, bold: false, text: 'Not used for this goal' },
  boldEm: 0.62,
  regularEm: 0.58,
  lineHeight: 1.3,
  /** Room after a label for the page count. */
  count: 30,
  /** Gap between a node's dot and its label. */
  gap: 6,
  /** Padding added to every label box (width, height). */
  padX: 8,
  padY: 6,
  /** Clearance kept between any two boxes. */
  margin: 6,
}

const round = (n) => Math.round(n * 10) / 10

/** Greedy word wrap. Never splits a word and never rewrites it. */
export function wrapText(text, maxChars) {
  const lines = []
  let cur = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (cur && cur.length + 1 + word.length > maxChars) {
      lines.push(cur)
      cur = word
    } else cur = cur ? `${cur} ${word}` : word
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

const textW = (s, font, bold) => s.length * font * (bold ? METRICS.boldEm : METRICS.regularEm)
const linesBox = (text, m) => {
  const lines = wrapText(text, m.wrap)
  return { w: Math.max(...lines.map((l) => textW(l, m.font, m.bold))), h: lines.length * m.font * METRICS.lineHeight }
}

/**
 * Estimated label boxes of one view node for both label sets, from text length:
 * `{names: {w, h}, questions: {w, h}}`. Pages show their name in both sets; Questions adds the
 * `pick_when` line(s) under it.
 */
export function labelBoxes(node, empty = false) {
  const level = node.level === 'stage' ? 'stage' : node.level === 'page' ? 'page' : 'node'
  const m = METRICS[level]
  const pad = (b, extra = 0) => ({
    w: round(b.w + METRICS.padX + (level === 'page' ? 0 : METRICS.count)),
    h: round(b.h + METRICS.padY + extra),
  })
  if (level === 'page') {
    const name = linesBox(node.shown_as, m)
    const pick = linesBox(node.pick_when, METRICS.pick)
    return {
      names: pad(name),
      questions: pad({ w: Math.max(name.w, pick.w), h: name.h + pick.h }),
    }
  }
  const noteBox = empty ? linesBox(METRICS.note.text, { ...METRICS.note, wrap: 99 }) : null
  const one = (text) => {
    const b = linesBox(text, m)
    if (!noteBox) return pad(b)
    return pad({ w: Math.max(b.w, noteBox.w), h: b.h + noteBox.h })
  }
  return { names: one(node.names_label), questions: one(node.question_label) }
}

/** Larger of the two sets. */
function maxBox(node, empty) {
  const b = labelBoxes(node, empty)
  return { w: Math.max(b.names.w, b.questions.w), h: Math.max(b.names.h, b.questions.h) }
}

export const dotRadius = (node) => METRICS[node.level === 'stage' ? 'stage' : node.level === 'page' ? 'page' : 'node'].dot

/** Rectangles a node occupies: its dot and its label (on the side given by `anchor`). */
export function nodeRects(n) {
  const { x, y, r, w, h, anchor } = n
  const x0 = anchor === 'start' ? x + r + METRICS.gap : x - r - METRICS.gap - w
  return [
    { x0: x - r, y0: y - r, x1: x + r, y1: y + r },
    { x0, y0: y - h / 2, x1: x0 + w, y1: y + h / 2 },
  ]
}

export function overlaps(a, b, margin = 0) {
  return a.x0 < b.x1 + margin && b.x0 < a.x1 + margin && a.y0 < b.y1 + margin && b.y0 < a.y1 + margin
}

/** Width of the sector shared by n children of one opened node (degrees). */
export const fanSector = (n) => (n <= 1 ? 0 : Math.min(SECTOR_MAX, SECTOR_BASE + SECTOR_PER_CHILD * (n - 1)))

const rad = (deg) => (deg * Math.PI) / 180
/** Right half and the top read clockwise; left half and the bottom read counter-clockwise. */
const clockwiseReading = (angle) => {
  const c = Math.cos(rad(angle))
  return c > 1e-9 || (Math.abs(c) <= 1e-9 && Math.sin(rad(angle)) < 0)
}
const anchorFor = (angle) => (Math.cos(rad(angle)) >= -1e-9 ? 'start' : 'end')

function place(node, angle, radius, empty = false) {
  const r = dotRadius(node)
  const { w, h } = maxBox(node, empty)
  return {
    id: node.id,
    level: node.level,
    angle: round(angle),
    radius: round(radius),
    x: round(radius * Math.cos(rad(angle))),
    y: round(radius * Math.sin(rad(angle))),
    anchor: anchorFor(angle),
    r,
    w,
    h,
  }
}

const HUB = { x0: -140, y0: -62, x1: 140, y1: 112 }
/** Obstacles are label/dot rectangles tagged with the node that owns them. */
const tagged = (nodes) => nodes.flatMap((n) => nodeRects(n).map((rect) => ({ id: n.id, rect })))

function boundsOf(rects) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rects) {
    x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1)
  }
  return { x0: round(x0), y0: round(y0), x1: round(x1), y1: round(y1) }
}

/**
 * Place the children of an opened node around its own angle. `shown` holds the tagged rectangles
 * already on screen (centre, stage ring, opened ancestors and their siblings). A child moves
 * outward along its ray until its dot and label clear all of them and the siblings placed before it.
 * (Straight links may pass under a neighbour's label; labels carry a halo, so they stay readable.)
 */
function fan(parent, children, shown) {
  const n = children.length
  const sector = fanSector(n)
  const dir = clockwiseReading(parent.angle) ? 1 : -1
  const placed = []
  const rects = [...shown]
  children.forEach((child, i) => {
    const angle = parent.angle + (n === 1 ? 0 : dir * (-sector / 2 + (sector * i) / (n - 1)))
    let radius = parent.radius + FAN_STEP
    let node = place(child, angle, radius)
    while (nodeRects(node).some((a) => rects.some((o) => overlaps(a, o.rect, METRICS.margin)))) {
      radius += RADIUS_STEP
      node = place(child, angle, radius)
    }
    placed.push(node)
    rects.push(...tagged([node]))
  })
  return { sector, children: placed, shown: rects }
}

/** Layout of one goal view. */
function goalLayout(view) {
  const ring = view.map((s, i) => place(s, -90 + (360 / view.length) * i, RING, s.children.length === 0))
  ring.forEach((n, i) => {
    n.empty = view[i].children.length === 0
    n.count = countPages(view[i])
  })
  const base = [{ id: 'hub', rect: HUB }, ...tagged(ring)]
  const fans = {}
  const fits = { root: boundsOf(base.map((o) => o.rect)) }

  const visit = (node, at, shown) => {
    if (node.level === 'page' || node.children.length === 0) return
    const f = fan(at, node.children, shown)
    fans[node.id] = { sector: f.sector, children: f.children.map((c, i) => ({ ...c, count: countPages(node.children[i]) })) }
    fits[node.id] = boundsOf(f.shown.map((o) => o.rect))
    node.children.forEach((child, i) => visit(child, f.children[i], f.shown))
  }
  view.forEach((s, i) => visit(s, ring[i], base))
  return { ring, fans, fits }
}

const countPages = (node) => (node.level === 'page' ? 1 : node.children.reduce((a, c) => a + countPages(c), 0))

export function computeLayout(index) {
  const { goals, views } = index.taxonomy
  return {
    version: 2,
    ring: RING,
    fanStep: FAN_STEP,
    sectorMax: SECTOR_MAX,
    metrics: METRICS,
    goals: Object.fromEntries(goals.map((g) => [g.id, goalLayout(views[g.id])])),
  }
}
