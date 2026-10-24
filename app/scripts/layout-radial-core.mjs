// Radial tree layout (spec 7.1, A5); the pure geometry, with no node imports so the app can share METRICS
// and wrapText. layout-radial.mjs adds the file I/O. Computed once at build time, stored, never recomputed in the app.
// Input: the content index (`taxonomy.views` holds one elided view tree per goal). Output: the layout
// object stored as content/derived/layout-radial.json (version 2).
//
// Geometry, in world units (1 unit = 1 px at scale 1) with the centre at (0, 0), y down, angles in
// degrees (0 = right, 90 = down, so increasing angles run clockwise):
//   stages   depth 1: 9 fixed slots on a ring of radius RING, pipeline order clockwise from the top,
//            the same in every goal. A stage with no pages for the goal is `empty`.
//   fans     for every non-page node with children, the positions of its children for the state where
//            that node is open. All children sit on ONE arc (siblings share a radius) around the open
//            node's own angle, in reading order, at the smallest radius at least FAN_STEP beyond the
//            node where nothing collides. The sector starts at fanSector(n) (capped at SECTOR_MAX) and
//            widens to the cap before the radius grows; when a neighbour's label blocks the outer
//            lanes it may narrow instead. Only if the plain arc needs more than PLAIN_GROW extra
//            radius do alternate children stagger between R and R + one box height.
//   boxes    a node's label box is centred on its ray, beyond the dot or toward the centre (stages
//            always toward the centre), sized for the larger of the Names and Questions sets, so
//            toggling the sets moves nothing. Each child picks the side that keeps links clear.
//   links    straight, parent to child. No link crosses another and none passes through a label other
//            than its own two ends (the dimmed ring-to-centre lines are not counted).
//   fits     per open node, the tail of the path (its stage, its parent, itself and its children), so
//            the camera can keep text readable; `root` frames the whole ring.
// Each fan is also required to leave room for the fans of the child levels below it (LOOKAHEAD), so
// every open path has a layout.
export const RING = 320
/** Smallest radial distance from an opened node to the arc of its children. */
export const FAN_STEP = 70
export const RADIUS_STEP = 6
const PLAIN_GROW = 140
const MAX_GROW = 1000
const WIDTH_STEP = 8
/** How many levels below a fan must still open compactly (within LOOK_GROW extra radius). */
const LOOKAHEAD = 1
const LOOK_GROW = 220
const SECTOR_MIN_PER_GAP = 3
export const SECTOR_MAX = 120
const SECTOR_BASE = 20
const SECTOR_PER_CHILD = 16

/** Label metrics (px at scale 1). Character widths are generous so wider reading fonts still fit. */
export const METRICS = {
  stage: { font: 16, bold: true, wrap: 14, dot: 20 },
  node: { font: 15, bold: true, wrap: 16, dot: 9 },
  page: { font: 15, bold: false, wrap: 22, dot: 12 },
  pick: { font: 13, bold: false, wrap: 26 },
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

/**
 * Rectangles a node occupies: its dot and its label box. The box is centred on the node's ray (the
 * line from the centre through the dot), `outward` or toward the centre of the canvas, with its
 * near edge `gap` from the dot, so labels near the top or bottom sit above or below their dot and
 * labels at the sides sit beside it. `dx`, `dy` are the box centre relative to the dot.
 */
export function nodeRects(n) {
  const { x, y, r, w, h, dx, dy } = n
  return [
    { x0: x - r, y0: y - r, x1: x + r, y1: y + r },
    { x0: x + dx - w / 2, y0: y + dy - h / 2, x1: x + dx + w / 2, y1: y + dy + h / 2 },
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
function place(node, angle, radius, empty = false, inward = false) {
  const r = dotRadius(node)
  const { w, h } = maxBox(node, empty)
  const ux = Math.cos(rad(angle))
  const uy = Math.sin(rad(angle))
  const t = Math.min(Math.abs(ux) < 1e-9 ? Infinity : w / 2 / Math.abs(ux), Math.abs(uy) < 1e-9 ? Infinity : h / 2 / Math.abs(uy))
  const d = (inward ? -1 : 1) * (r + METRICS.gap + t)
  return {
    id: node.id,
    level: node.level,
    angle: round(angle),
    radius: round(radius),
    x: round(radius * ux),
    y: round(radius * uy),
    dx: round(d * ux),
    dy: round(d * uy),
    inward,
    r,
    w,
    h,
  }
}

const HUB = { x0: -100, y0: -62, x1: 100, y1: 112 }
/** The centre glyph only (its label is left out of a stage's fit box). */
const HUB_DOT = { x0: -44, y0: -44, x1: 44, y1: 44 }
/** Obstacles are label/dot rectangles tagged with the node that owns them. */
const tagged = (nodes) => nodes.flatMap((n) => nodeRects(n).map((rect) => ({ id: n.id, rect })))

export function boundsOf(rects) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rects) {
    x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1)
  }
  return { x0: round(x0), y0: round(y0), x1: round(x1), y1: round(y1) }
}

/** Does the segment a-b touch the rectangle (grown by `margin`)? Liang-Barsky clip. */
export function segmentHitsRect(a, b, r, margin = 0) {
  const x0 = r.x0 - margin, x1 = r.x1 + margin, y0 = r.y0 - margin, y1 = r.y1 + margin
  const dx = b.x - a.x, dy = b.y - a.y
  let t0 = 0, t1 = 1
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]) {
    if (p === 0) {
      if (q < 0) return false
    } else {
      const t = q / p
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t } else { if (t < t0) return false; if (t < t1) t1 = t }
    }
  }
  return true
}

/** Do segments a-b and c-d cross? Segments that share an end point (a link pair at one node) do not. */
export function segmentsCross(a, b, c, d) {
  const same = (p, q) => Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5
  if (same(a, c) || same(a, d) || same(b, c) || same(b, d)) return false
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b)
}

/**
 * Can these children (placed on one arc) go on screen? `state` holds what is already shown:
 * tagged rects and links. Boxes must clear every rect, every link and each other; each child's own
 * link (parent to child) must clear every box except its endpoints' own, and every other link.
 */
function feasible(parent, nodes, state) {
  const mine = nodes.map((n) => ({ n, rects: nodeRects(n) }))
  for (const { rects } of mine) {
    for (const a of rects) {
      if (state.rects.some((o) => overlaps(a, o.rect, METRICS.margin))) return false
      if (state.links.some((l) => segmentHitsRect(l.a, l.b, a, 3))) return false
    }
  }
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 1; j < mine.length; j++) {
      if (mine[i].rects.some((a) => mine[j].rects.some((b) => overlaps(a, b, METRICS.margin)))) return false
    }
  }
  const p = { x: parent.x, y: parent.y }
  for (let i = 0; i < mine.length; i++) {
    const q = { x: mine[i].n.x, y: mine[i].n.y }
    if (state.rects.some((o) => o.id !== parent.id && segmentHitsRect(p, q, o.rect, 3))) return false
    if (mine.some((m, j) => j !== i && m.rects.some((r) => segmentHitsRect(p, q, r, 3)))) return false
    if (state.links.some((l) => segmentsCross(p, q, l.a, l.b))) return false
  }
  return true
}

/**
 * Place the children of an opened node on ONE arc around the node's own angle, at the smallest
 * radius (at least FAN_STEP beyond the node) where everything fits, widening the sector up to
 * SECTOR_MAX before growing the radius. Only when the plain arc needs more than PLAIN_GROW extra
 * radius may alternate children stagger between two radii (R and R + one box height).
 */
function* candidates(parent, children, state, lookahead = LOOKAHEAD, limit = MAX_GROW) {
  const n = children.length
  const base = fanSector(n)
  const wide = [base]
  if (n > 1) {
    for (let w = base + WIDTH_STEP; w < SECTOR_MAX; w += WIDTH_STEP) wide.push(w)
    if (base < SECTOR_MAX) wide.push(SECTOR_MAX)
  }
  // A neighbour's label can sit across the outer lanes of the sector; only then are narrower sectors
  // tried (second pass), and the sector that was used is stored.
  const narrow = []
  for (let w = SECTOR_MIN_PER_GAP * (n - 1); w < base; w += WIDTH_STEP) narrow.push(w)
  // Labels sit outward of their dots, or toward the centre (clear of open siblings' lanes); both are tried.
  const canOpen = children.some((c) => c.children.length > 0)
  const dir = clockwiseReading(parent.angle) ? 1 : -1
  const boxH = Math.max(...children.map((c) => maxBox(c, false).h))
  for (const [widths, maxGrow] of [[[...wide, ...narrow], limit]]) {
    if (widths.length === 0) continue
    for (let grow = 0; grow <= maxGrow; grow += RADIUS_STEP) {
      const radius = parent.radius + FAN_STEP + grow
      for (const stagger of grow >= PLAIN_GROW && n > 1 ? [false, true] : [false]) {
        for (const sector of widths) {
          // Children go on one by one; each takes the first label side (toward the centre or outward)
          // that clears everything placed so far, so one wide label cannot block its siblings' lanes.
          const nodes = []
          let cur = state
          let ok = true
          for (let i = 0; i < n && ok; i++) {
            const angle = parent.angle + (n === 1 ? 0 : dir * (-sector / 2 + (sector * i) / (n - 1)))
            const rad2 = radius + (stagger && i % 2 === 1 ? boxH : 0)
            const leaf = children[i].children.length === 0
            ok = false
            for (const inward of leaf && !canOpen ? [false, true] : [true, false]) {
              const node = place(children[i], angle, rad2, false, inward)
              if (!feasible(parent, [node], cur)) continue
              nodes.push(node)
              cur = {
                rects: [...cur.rects, ...tagged([node])],
                links: [...cur.links, { a: { x: parent.x, y: parent.y }, b: { x: node.x, y: node.y } }],
              }
              ok = true
              break
            }
          }
          if (!ok) continue
          // Every child that can open must still have room for its own fan.
          if (lookahead > 0 && !children.every((c, i) => c.children.length === 0 || candidates(nodes[i], c.children, cur, lookahead - 1, LOOK_GROW).next().value)) continue
          yield { sector, radius, stagger, children: nodes }
        }
      }
    }
  }
}

/** Layout of one goal view. */
function goalLayout(view) {
  const ring = view.map((s, i) => place(s, -90 + (360 / view.length) * i, RING, s.children.length === 0, true))
  ring.forEach((n, i) => {
    n.empty = view[i].children.length === 0
    n.count = countPages(view[i])
  })
  // Links from the stage ring to the centre are left out of the crossing checks (they are dimmed).
  const base = { rects: [{ id: 'hub', rect: HUB }, ...tagged(ring)], links: [] }
  const fans = {}
  const fits = { root: boundsOf(base.rects.map((o) => o.rect)) }

  const visit = (node, at, parent, stage, state) => {
    if (node.level === 'page' || node.children.length === 0) return
    const f = candidates(at, node.children, state).next().value
    if (!f) throw new Error(`layout: no room for the children of ${node.id}`)
    const kids = f.children.map((c, i) => ({ ...c, count: countPages(node.children[i]) }))
    fans[node.id] = { sector: f.sector, radius: f.radius, stagger: f.stagger, children: kids }
    // Fit box: the tail of the open path (the stage, the parent, the open node and its children).
    const tail = [...tagged([stage, at, ...kids]).map((o) => o.rect), ...(parent ? nodeRects(parent) : [HUB_DOT])]
    fits[node.id] = boundsOf(tail)
    const next = {
      rects: [...state.rects, ...tagged(kids)],
      links: [...state.links, ...kids.map((k) => ({ a: { x: at.x, y: at.y }, b: { x: k.x, y: k.y } }))],
    }
    node.children.forEach((child, i) => visit(child, kids[i], at, stage, next))
  }
  view.forEach((s, i) => visit(s, ring[i], null, ring[i], base))
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
