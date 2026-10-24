// Radial tree (spec 7.1, 3.4, 10.7). Draws the stored per-goal layout (scripts/layout-radial.mjs): the
// nine-stage ring, and for the opened path each opened node's children fanned out from it. Nothing here
// computes geometry. The camera scales the stored fit box, never below MIN_K; a fan wider than the canvas
// is reached by panning (drag, wheel, keyboard focus) with edge indicators for children out of view.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconBinaryTree2, IconList } from '@tabler/icons-react'
import { useIndex } from '@/content/load'
import type { ContentIndex, TaxGoal, TaxNode } from '@/content/types'
import { METRICS, boundsOf, nodeRects, wrapText, type GoalLayout, type LayoutNode, type RadialLayout } from '../../scripts/layout-radial-core.mjs'
import { STAGES, type Stage } from '@/components/StageBadge'
import { useShellState, type LabelMode } from '@/shell/ShellState'
import { ARCHETYPE_ICONS } from './archetypeIcons'
import CatalogueList from './CatalogueList'
import { RelationshipLines, endpointLabel, resolveLines, type LineNode } from './RelationshipLines'
import { useConnections } from './connections'
import { RelationshipLegend } from './relationshipStyles'
import {
  MIN_K_LINES,
  PAD,
  camTransform,
  centreOn,
  clampPan,
  fitScale,
  frameTail,
  offscreen,
  reveal,
  sameCam,
  unionBox,
  type Box,
  type Cam,
  type Pad,
  type Side,
} from './camera'
import './radial-tree.css'

gsap.registerPlugin(CustomEase)
/** The spec easing (10.7). */
CustomEase.create('rt-spec', '0.22,1,0.36,1')

// ---- layout loading (stored positions; the app never lays out) ----

let layoutPromise: Promise<RadialLayout> | null = null
function loadLayout(): Promise<RadialLayout> {
  if (!layoutPromise) {
    layoutPromise = fetch(import.meta.env.BASE_URL + 'data/layout-radial.json')
      .then((r) => {
        if (!r.ok) throw new Error(`layout ${r.status}`)
        return r.json() as Promise<RadialLayout>
      })
      .catch((e) => {
        layoutPromise = null
        throw e
      })
  }
  return layoutPromise
}
/** Test helper. */
export function clearLayoutCache() {
  layoutPromise = null
}

function useLayout() {
  const [state, setState] = useState<{ layout: RadialLayout | null; error: boolean }>({ layout: null, error: false })
  useEffect(() => {
    let live = true
    loadLayout().then(
      (layout) => live && setState({ layout, error: false }),
      () => live && setState({ layout: null, error: true }),
    )
    return () => {
      live = false
    }
  }, [])
  return state
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const sk = (stage: string) => `s:${stage}`
const fk = (stage: string, id: string) => `f:${stage}/${id}`
const ik = (id: string) => `i:${id}`
const keyOf = (n: LayoutNode, stage?: string) => (n.level === 'stage' ? sk(n.id) : n.level === 'page' ? ik(n.id) : fk(stage ?? '', n.id))
const metricsOf = (level: LayoutNode['level']) => METRICS[level === 'stage' ? 'stage' : level === 'page' ? 'page' : 'node']
const boxOf = (n: LayoutNode): Box => boundsOf(nodeRects(n))
/** Dimmed stage rings and icons keep 3:1 against the canvas in both themes (checked, see ARCHITECTURE.md). */

/** Where a node sits in the goal view. */
interface Info {
  node: TaxNode
  parent: string | null
  stage: Stage
}

/** The text a node shows in the current label set. Pages always show their real name. */
export function labelOf(n: TaxNode, mode: LabelMode): string {
  if (n.level === 'page') return n.shown_as ?? n.id
  return (mode === 'questions' ? (n.question_label ?? n.names_label) : n.names_label) ?? n.id
}

function indexView(view: TaxNode[]) {
  const info = new Map<string, Info>()
  const walk = (n: TaxNode, parent: string | null, stage: Stage) => {
    info.set(n.id, { node: n, parent, stage })
    for (const c of n.children) walk(c, n.id, stage)
  }
  for (const s of view) walk(s, null, s.id as Stage)
  return info
}

function pathOf(info: Map<string, Info>, id: string | null): string[] {
  const out: string[] = []
  for (let cur = id; cur; cur = info.get(cur)?.parent ?? null) out.unshift(cur)
  return out
}

/** What the centre says: the open node's prompt (Questions) or name (Names). */
export function centreText(mode: LabelMode, goal: TaxGoal, open: TaxNode | null, rootPrompt: string): string {
  if (mode === 'names') return open ? (open.names_label ?? open.id) : goal.names_label
  if (!open) return rootPrompt
  return open.question_prompt ?? 'Which one fits?'
}

/** The breadcrumb chain in the current label set: the opened nodes, then the open page. */
export function crumbChain(mode: LabelMode, path: TaxNode[], page: TaxNode | null): string[] {
  return [...path, ...(page ? [page] : [])].map((n) => labelOf(n, mode))
}

// ---- component ----

export default function RadialTree({ activeId }: { activeId?: string }) {
  const { data } = useIndex()
  const { layout, error } = useLayout()
  const { goal: goalId } = useShellState()
  const [list, setList] = useState(false)

  if (list) {
    return (
      <div className="relative h-full">
        <div className="absolute top-4 left-4 z-10">
          <button type="button" onClick={() => setList(false)} className="rt-switch">
            <IconBinaryTree2 aria-hidden className="size-4" /> Show as tree
          </button>
        </div>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 pt-20 pb-6">
            <CatalogueList activeId={activeId} />
          </div>
        </div>
      </div>
    )
  }

  const goal = data?.taxonomy?.goals.find((g) => g.id === goalId) ?? data?.taxonomy?.goals[0]
  const goalLayout = goal ? layout?.goals[goal.id] : undefined
  return (
    <div className="relative h-full">
      {error ? (
        <p className="p-6 pt-20 text-block-text">Could not load the tree layout. Try reloading, or use the list.</p>
      ) : !data || !layout || !goal || !goalLayout ? (
        <p className="p-6 pt-20 text-text-muted">Loading the tree…</p>
      ) : (
        <Canvas data={data} goal={goal} layout={goalLayout} activeId={activeId} onList={() => setList(true)} />
      )}
    </div>
  )
}

function Canvas({ data, goal, layout, activeId, onList }: { data: ContentIndex; goal: TaxGoal; layout: GoalLayout; activeId?: string; onList: () => void }) {
  const navigate = useNavigate()
  const { labels: mode } = useShellState()
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const camGRef = useRef<SVGGElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [openState, setOpenId] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(layout.ring[0].id)
  const wantFocus = useRef(false)
  const [syncedId, setSyncedId] = useState<string | undefined>(undefined)
  const [syncedGoal, setSyncedGoal] = useState(goal.id)

  const view = data.taxonomy.views[goal.id]
  const info = useMemo(() => indexView(view), [view])
  const pageById = useMemo(() => new Map(data.pages.map((p) => [p.id, p])), [data])
  const archName = useMemo(() => new Map(data.vocab.archetypes.map((a) => [a.id, a.name])), [data])

  // Another goal swaps the stored layout. The open stage stays open if it still has children.
  if (goal.id !== syncedGoal) {
    setSyncedGoal(goal.id)
    const stage = openState ? pathOf(indexView(data.taxonomy.views[syncedGoal]), openState)[0] : null
    const keep = stage && (info.get(stage)?.node.children.length ?? 0) > 0 ? stage : null
    setOpenId(keep)
    if (!keep) setFocusKey(layout.ring[0].id)
  }

  // A page opened from elsewhere (link, search, reload) opens its branch.
  if (activeId !== syncedId) {
    setSyncedId(activeId)
    const at = activeId ? info.get(activeId) : undefined
    if (at?.parent) {
      setOpenId(at.parent)
      setFocusKey(activeId!)
    }
  }

  // Between a goal change and the re-render it asks for, the old open node may not exist in this layout.
  const openId = openState && layout.fans[openState] ? openState : null
  const path = useMemo(() => pathOf(info, openId), [info, openId])
  const keyFor = (n: LayoutNode) => keyOf(n, info.get(n.id)!.stage)

  // Everything on screen: the ring, then each opened node's children.
  const shown = useMemo(() => {
    const out: { n: LayoutNode; parent: string | null }[] = layout.ring.map((n) => ({ n, parent: null }))
    for (const id of path) for (const n of layout.fans[id]?.children ?? []) out.push({ n, parent: id })
    return out
  }, [layout, path])
  const pos = useMemo(() => new Map(shown.map((s) => [s.n.id, s.n])), [shown])

  // Connection lines for the selected page, between visible nodes only.
  const { on } = useConnections()
  const lines = useMemo(() => {
    if (!activeId || on.size === 0) return []
    const nodes = new Map<string, LineNode>()
    for (const { n } of shown) {
      const side = n.dx >= 0 ? 1 : -1
      nodes.set(keyOf(n, info.get(n.id)!.stage), { x: n.x, y: n.y, side })
    }
    return resolveLines(data.relationships, activeId, on, pageById, nodes)
  }, [activeId, on, shown, info, data, pageById])
  const lineTypes = useMemo(() => [...new Set(lines.map((l) => l.type))], [lines])
  const endNodes = useMemo(() => new Set(lines.flatMap((l) => [l.from.key, l.to.key])), [lines])

  // A line that ends at a collapsed branch is labelled beside that node's label box.
  const endLabels = useMemo(() => {
    const byKey = new Map<string, { n: LayoutNode; texts: string[] }>()
    for (const l of lines) {
      if (!l.hidden) continue
      const n = shown.find((s) => keyOf(s.n, info.get(s.n.id)!.stage) === l.to.key)?.n
      if (!n) continue
      const g = byKey.get(l.to.key) ?? { n, texts: [] }
      g.texts.push(endpointLabel(l))
      byKey.set(l.to.key, g)
    }
    // Beside the dot on the outer side of the node's ray (the ring's outside is free of labels).
    return [...byKey.values()].map(({ n, texts }) => {
      const ux = Math.cos((n.angle * Math.PI) / 180)
      const uy = Math.sin((n.angle * Math.PI) / 180)
      const w = Math.max(...texts.map((t) => t.length)) * 13 * METRICS.regularEm
      const h = texts.length * 17
      const t = Math.min(Math.abs(ux) < 1e-9 ? Infinity : w / 2 / Math.abs(ux), Math.abs(uy) < 1e-9 ? Infinity : h / 2 / Math.abs(uy))
      const d = n.r + 10 + t
      return { n, cx: n.x + ux * d, cy: n.y + uy * d, w, h, texts }
    })
  }, [lines, shown, info])

  // ---- camera ----
  // `camRef` is the live camera (a tween or a drag moves it without re-rendering); `target` is where a flight
  // in progress ends; `settled` is the camera at rest, which the edge indicators read.
  const camRef = useRef<Cam>({ k: 1, x: 0, y: 0 })
  const target = useRef<Cam>({ k: 1, x: 0, y: 0 })
  const tween = useRef<gsap.core.Tween | null>(null)
  const [settled, setSettled] = useState<Cam | null>(null)
  const settleTimer = useRef(0)
  // True after a pan by hand: a new canvas size then keeps the view instead of refitting it.
  const panned = useRef(false)
  const markPanned = useCallback((v: boolean) => {
    panned.current = v
  }, [])

  const apply = useCallback((c: Cam) => {
    camRef.current = c
    camGRef.current?.setAttribute('transform', camTransform(c))
  }, [])
  // Every render keeps the live camera on the element (React does not own the transform).
  useLayoutEffect(() => {
    camGRef.current?.setAttribute('transform', camTransform(camRef.current))
  })

  const world = useMemo<Box>(() => unionBox([{ x0: -100, y0: -62, x1: 100, y1: 112 }, ...shown.map((s) => boxOf(s.n))]), [shown])
  const stop = useCallback(() => {
    tween.current?.kill()
    tween.current = null
    window.clearTimeout(settleTimer.current)
  }, [])

  /** Fly (or, with reduced motion, jump) to a camera; `jump` forces a jump. */
  const fly = useCallback(
    (to: Cam, jump = false) => {
      stop()
      target.current = to
      const from = camRef.current
      if (jump || reducedMotion() || sameCam(from, to)) {
        apply(to)
        setSettled(to)
        return
      }
      const dist = Math.hypot(to.x - from.x, to.y - from.y) + Math.abs(to.k - from.k) * 500
      const o = { ...from }
      setSettled(null)
      tween.current = gsap.to(o, {
        k: to.k,
        x: to.x,
        y: to.y,
        duration: Math.min(0.9, 0.6 + dist / 3000),
        ease: 'rt-spec',
        onUpdate: () => apply({ k: o.k, x: o.x, y: o.y }),
        onComplete: () => {
          tween.current = null
          apply(to)
          setSettled(to)
        },
      })
    },
    [apply, stop],
  )

  const pan = useCallback(
    (dx: number, dy: number) => {
      if (!size) return
      stop()
      markPanned(true)
      const c = clampPan({ ...camRef.current, x: camRef.current.x + dx, y: camRef.current.y + dy }, world, size)
      apply(c)
      target.current = c
      setSettled(null)
      settleTimer.current = window.setTimeout(() => setSettled(camRef.current), 140)
    },
    [apply, markPanned, size, stop, world],
  )

  /** The camera that frames the open node (or the ring) at the current canvas size. */
  const frame = (): Cam => {
    const vp = size!
    const tail = layout.fits[openId ?? 'root'] ?? layout.fits.root
    if (lines.length > 0) {
      // Connection lines end anywhere on the ring, so while they show the camera frames the whole ring.
      let box = boundsOf([tail, layout.fits.root]) as Box
      for (const e of endLabels) box = unionBox([box, { x0: e.cx - e.w / 2, y0: e.cy - e.h / 2, x1: e.cx + e.w / 2, y1: e.cy + e.h / 2 }])
      const pad: Pad = { ...PAD, t: 156 }
      return centreOn(box, fitScale(box, vp, pad, MIN_K_LINES), vp, pad)
    }
    return frameTail(tail, openId ? boxOf(pos.get(openId)!) : null, openId ? layout.fans[openId].children.map(boxOf) : [], vp)
  }

  // Canvas size.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize((s) => (s && Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }))
      else setSize((s) => s ?? { w: 800, h: 640 })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Frame the open node when the open path, the goal or the connection lines change; a new canvas size
  // (the panel opening) only keeps the focused node in view, so a pan made by hand is not undone.
  const framed = useRef<{ openId: string | null; layout: GoalLayout; lines: number } | null>(null)
  const [revealReq, setRevealReq] = useState<{ id: string; n: number } | null>(null)
  const requestReveal = useCallback((id: string) => setRevealReq((r) => ({ id, n: (r?.n ?? 0) + 1 })), [])
  const focusKeyRef = useRef(focusKey)
  useLayoutEffect(() => {
    focusKeyRef.current = focusKey
  }, [focusKey])
  useLayoutEffect(() => {
    if (!size) return
    const prev = framed.current
    framed.current = { openId, layout, lines: lines.length }
    if (!prev) return fly(frame(), true)
    if (prev.openId !== openId || prev.layout !== layout || prev.lines !== lines.length) {
      markPanned(false)
      return fly(frame())
    }
    // Size change only (the panel opening or closing): refit, as a jump, unless the view was panned by hand.
    const base = panned.current ? target.current : frame()
    const n = pos.get(focusKeyRef.current)
    fly(n ? reveal(base, boxOf(n), size) : base, true)
    // frame() reads the values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, openId, layout, lines.length, endLabels])

  // Focus or selection brings the node's whole label into view.
  useLayoutEffect(() => {
    if (!revealReq || !size) return
    const n = pos.get(revealReq.id)
    if (n) fly(reveal(target.current, boxOf(n), size))
    // Only a new request moves the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealReq])

  useEffect(() => stop, [stop])

  // Drag to pan, wheel and trackpad to pan. A drag does not click.
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)
  const pointerDown = useRef(false)
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointerDown.current = true
    if (e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return
      d.moved = true
      svgRef.current?.setPointerCapture?.(e.pointerId)
      svgRef.current?.setAttribute('data-dragging', 'true')
    }
    pan(e.clientX - d.x, e.clientY - d.y)
    d.x = e.clientX
    d.y = e.clientY
  }
  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointerDown.current = false
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    svgRef.current?.removeAttribute('data-dragging')
    if (d.moved) {
      swallowClick.current = true
      window.setTimeout(() => (swallowClick.current = false), 0)
    }
  }
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom stays the browser's
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      pan(-e.deltaX * unit, -e.deltaY * unit)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pan])

  // Keyboard focus follows state changes made by keys.
  useEffect(() => {
    if (!wantFocus.current) return
    wantFocus.current = false
    const el = svgRef.current?.querySelector<SVGGElement>(`[data-key="${CSS.escape(focusKey)}"]`)
    el?.focus({ preventScroll: true })
    // A busy browser can drop a focus call made as the old node leaves the DOM; try once more next frame.
    if (el && document.activeElement !== el) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [focusKey, shown])

  const hasKids = (id: string) => (info.get(id)?.node.children.length ?? 0) > 0
  const isOpen = (id: string) => path.includes(id)
  const siblingsOf = (id: string) => {
    const parent = shown.find((s) => s.n.id === id)?.parent ?? null
    return shown.filter((s) => s.parent === parent).map((s) => s.n.id)
  }
  const toggle = (id: string) => setOpenId(isOpen(id) ? (info.get(id)!.parent ?? null) : id)
  const activate = (id: string) => {
    const i = info.get(id)!
    if (i.node.level === 'page') navigate(`/page/${id}`)
    else if (hasKids(id)) toggle(id)
  }
  const move = (id: string) => {
    wantFocus.current = true
    setFocusKey(id)
    requestReveal(id)
  }

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    pointerDown.current = false
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // The focused node comes from the event itself, so keys pressed before state catches up still land.
    const cur = (e.target as Element).closest?.('[data-key]')?.getAttribute('data-key') ?? focusKey
    if (!pos.has(cur)) return
    const sibs = siblingsOf(cur)
    const at = sibs.indexOf(cur)
    let handled = true
    switch (e.key) {
      case 'ArrowDown':
        if (sibs[at + 1]) move(sibs[at + 1])
        break
      case 'ArrowUp':
        if (sibs[at - 1]) move(sibs[at - 1])
        break
      case 'Home':
        move(sibs[0])
        break
      case 'End':
        move(sibs[sibs.length - 1])
        break
      case 'ArrowRight':
        if (hasKids(cur)) {
          if (!isOpen(cur)) {
            toggle(cur)
            wantFocus.current = true
          } else move(layout.fans[cur].children[0].id)
        }
        break
      case 'ArrowLeft':
        if (isOpen(cur)) {
          toggle(cur)
          wantFocus.current = true
        } else if (info.get(cur)?.parent) move(info.get(cur)!.parent!)
        break
      case 'Enter':
      case ' ':
        activate(cur)
        wantFocus.current = true
        break
      case 'Escape':
        if (openId) {
          const was = openId
          setOpenId(info.get(was)!.parent)
          move(was)
        } else handled = false
        break
      default:
        handled = false
    }
    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // ---- edge indicators: children of the open node (or the stages at the root) that are out of view ----
  const kids = useMemo(() => (openId ? (layout.fans[openId]?.children ?? []) : layout.ring).map((n) => ({ n, box: boxOf(n) })), [layout, openId])
  const more = useMemo(() => (settled && size ? offscreen(kids, settled, size) : null), [kids, settled, size])
  const goMore = useCallback((side: Side) => {
    if (!more || !size || !settled || more[side].length === 0) return
    const horizontal = side === 'left' || side === 'right'
    const dir = side === 'left' || side === 'top' ? 1 : -1
    const hidden = unionBox(more[side].map((s) => s.box))
    const cam = settled
    const ideal = reveal(cam, hidden, size)
    const avail = horizontal ? size.w - PAD.l - PAD.r : size.h - PAD.t - PAD.b
    const span = ((horizontal ? hidden.x1 - hidden.x0 : hidden.y1 - hidden.y0) * cam.k)
    // The hidden children fit: bring them all in. Otherwise move most of a screen toward them.
    if (span <= avail) return fly(ideal)
    fly(horizontal ? { ...cam, x: cam.x + dir * avail * 0.75 } : { ...cam, y: cam.y + dir * avail * 0.75 })
  }, [more, size, settled, fly])

  // ---- text ----
  const openNode = openId ? info.get(openId)!.node : null
  const centre = centreText(mode, goal, openNode, data.taxonomy.root.question_prompt)
  const activeNode = activeId && info.get(activeId)?.node.level === 'page' ? info.get(activeId)!.node : null
  const crumb = crumbChain(mode, path.map((id) => info.get(id)!.node), activeNode && info.get(activeId!)!.parent === openId ? activeNode : null)
  const status = openNode ? `${labelOf(openNode, mode)} open, ${plural(layout.fans[openId!].children.length, 'item')}.` : 'All stages shown.'

  /** Wrapped lines and where they sit; the same rules the layout used for the stored boxes. */
  const textOf = (n: LayoutNode, node: TaxNode) => {
    const m = metricsOf(n.level)
    const name = wrapText(labelOf(node, mode), m.wrap)
    const pick = n.level === 'page' && mode === 'questions' && node.pick_when ? wrapText(node.pick_when, METRICS.pick.wrap) : []
    const lh = m.font * METRICS.lineHeight
    const plh = METRICS.pick.font * METRICS.lineHeight
    const nlh = METRICS.note.font * METRICS.lineHeight
    const total = name.length * lh + pick.length * plh + (n.empty ? nlh : 0)
    const top = n.dy - total / 2
    return { m, name, pick, lh, plh, nlh, top, count: n.level !== 'page' && !n.empty }
  }
  // Each count sits right after the last line of its name: measured in the browser, estimated until then.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    for (const t of svg.querySelectorAll<SVGTextElement>('[data-count-for]')) {
      const last = svg.querySelector<SVGTSpanElement>(`[role="treeitem"][data-key="${CSS.escape(t.dataset.countFor!)}"] .rt-name > tspan:last-child`)
      const len = last?.getComputedTextLength?.()
      if (len) t.setAttribute('x', String(Number(t.dataset.dx) + len / 2 + 7))
    }
  })

  const treeFocus = pos.has(focusKey) ? focusKey : layout.ring[0].id
  const centreLines = wrapText(centre, 20)

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        role="tree"
        aria-label={`${goal.names_label} pages by stage, group, family and page`}
        className="rt-svg absolute inset-0 size-full"
        data-conn={lines.length > 0 ? 'on' : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <g ref={camGRef} className="rt-cam">
          <g aria-hidden>
            {layout.ring.map((n) => (
              <path key={`c-${n.id}`} d={`M0 0L${n.x} ${n.y}`} className="rt-link" />
            ))}
            {shown
              .filter((s) => s.parent)
              .map(({ n, parent }) => {
                const p = pos.get(parent!)!
                return <path key={`l-${n.id}`} d={`M${p.x} ${p.y}L${n.x} ${n.y}`} data-parent={parent} data-child={n.id} className="rt-link rt-link-hot" style={{ '--rt-stage': `var(--stage-${info.get(n.id)!.stage})` } as React.CSSProperties} />
              })}
          </g>

          <RelationshipLines lines={lines} />

          <g aria-hidden data-testid="rt-centre">
            <circle r={40} fill="var(--surface-1)" stroke="var(--accent)" strokeWidth={2.5} />
            <IconBinaryTree2 x={-14} y={-14} size={28} color="var(--accent-strong)" />
            <text textAnchor="middle" className="rt-label rt-name" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
              {centreLines.map((l, k) => (
                <tspan key={k} x={0} y={63 + k * 19.5}>
                  {k < centreLines.length - 1 ? `${l} ` : l}
                </tspan>
              ))}
            </text>
          </g>

          {shown.map(({ n }) => {
            const i = info.get(n.id)!
            const node = i.node
            const page = node.level === 'page' ? pageById.get(n.id) : undefined
            const written = node.level !== 'page' || page?.has_record !== false
            const color = `var(--stage-${i.stage})`
            const dimmed = n.level === 'stage' && (n.empty || (openId !== null && n.id !== path[0]))
            const StageIcon = STAGES[i.stage].Icon
            const ArchIcon = page ? ARCHETYPE_ICONS[page.archetype] : null
            const { m, name, top, lh } = textOf(n, node)
            const expanded = n.level === 'page' ? undefined : hasKids(n.id) ? isOpen(n.id) : undefined
            const sentence = node.question_sentence ?? `${labelOf(node, 'names')} ${node.level}`
            const label =
              node.level === 'page'
                ? `${node.shown_as}, ${archName.get(page?.archetype ?? 'model') ?? page?.archetype}${written ? '' : ', not written yet'}${node.pick_when ? `. ${node.pick_when}` : ''}`
                : `${labelOf(node, mode)}. ${sentence}`
            const sibs = siblingsOf(n.id)
            return (
              <g
                key={n.id}
                role="treeitem"
                data-key={n.id}
                data-active={page && n.id === activeId ? 'true' : undefined}
                data-end={endNodes.has(keyFor(n)) ? 'true' : undefined}
                data-dim={dimmed ? 'true' : undefined}
                aria-label={label}
                aria-level={path.indexOf(i.parent ?? '') + 2}
                aria-setsize={sibs.length}
                aria-posinset={sibs.indexOf(n.id) + 1}
                aria-expanded={expanded}
                aria-selected={page ? n.id === activeId : undefined}
                aria-disabled={n.empty || undefined}
                tabIndex={n.id === treeFocus ? 0 : -1}
                className={`rt-node${n.level !== 'stage' ? ' rt-fade' : ''}`}
                style={{ '--rt-stage': color } as React.CSSProperties}
                transform={`translate(${n.x} ${n.y})`}
                onFocus={() => {
                  setFocusKey(n.id)
                  if (!pointerDown.current) requestReveal(n.id)
                }}
                onClick={() => {
                  setFocusKey(n.id)
                  requestReveal(n.id)
                  activate(n.id)
                }}
              >
                <rect x={Math.min(-n.r, n.dx - n.w / 2)} y={Math.min(-n.r, n.dy - n.h / 2)} width={Math.max(n.r, n.dx + n.w / 2) - Math.min(-n.r, n.dx - n.w / 2)} height={Math.max(n.r, n.dy + n.h / 2) - Math.min(-n.r, n.dy - n.h / 2)} fill="transparent" />
                <circle className="rt-focus" r={n.r + 5} />
                <circle className="rt-disc" r={n.r} stroke={color} strokeWidth={n.level === 'stage' ? 2.5 : 2} strokeDasharray={written ? undefined : '3 2.5'} />
                {n.level === 'stage' ? (
                  <g className="rt-icon" transform="translate(-11 -11)" style={{ color }}>
                    <StageIcon className="size-[22px]" aria-hidden />
                  </g>
                ) : ArchIcon ? (
                  <g className="rt-icon" transform="translate(-8 -8)" style={{ color, opacity: written ? 1 : 0.65 }}>
                    <ArchIcon className="size-4" aria-hidden />
                  </g>
                ) : null}
                <text
                  textAnchor="middle"
                  className={`rt-label rt-name${written && !dimmed ? '' : ' rt-label-muted'}`}
                  style={{ fontSize: m.font, fontWeight: m.bold ? 700 : 400, fontStyle: written ? undefined : 'italic' }}
                >
                  {name.map((l, k) => (
                    <tspan key={k} x={n.dx} y={top + lh * 0.78 + k * lh}>
                      {k < name.length - 1 ? `${l} ` : l}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}

          {/* Counts, the pick_when lines and the "Not used" note sit beside the tree items, not in them, so an
              item's visible text is exactly its label (WCAG label in name). */}
          <g aria-hidden pointerEvents="none">
            {shown.map(({ n }) => {
              const node = info.get(n.id)!.node
              const { m, name, pick, lh, plh, nlh, top, count } = textOf(n, node)
              const dimmed = n.level === 'stage' && (n.empty || (openId !== null && n.id !== path[0]))
              const lastLine = name[name.length - 1]
              const est = lastLine.length * m.font * (m.bold ? METRICS.boldEm : METRICS.regularEm)
              return (
                <g key={n.id} data-extra-for={n.id} data-end={endNodes.has(keyFor(n)) ? 'true' : undefined} transform={`translate(${n.x} ${n.y})`}>
                  {count ? (
                    <text data-count-for={n.id} data-dx={n.dx} data-est={est} x={n.dx + est / 2 + 7} y={top + lh * 0.78 + (name.length - 1) * lh} className="rt-label rt-count" style={{ fontSize: m.font - 1 }}>
                      {n.count}
                    </text>
                  ) : null}
                  {pick.length > 0 && lines.length === 0 ? (
                    <text textAnchor="middle" className="rt-label rt-label-muted rt-pick" style={{ fontSize: METRICS.pick.font }}>
                      {pick.map((l, k) => (
                        <tspan key={k} x={n.dx} y={top + name.length * lh + plh * 0.78 + k * plh}>
                          {l}
                        </tspan>
                      ))}
                    </text>
                  ) : null}
                  {n.empty ? (
                    <text x={n.dx} y={top + name.length * lh + nlh * 0.72} textAnchor="middle" className="rt-label rt-label-muted rt-note" data-dim={dimmed ? 'true' : undefined} style={{ fontSize: METRICS.note.font }}>
                      {METRICS.note.text}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>

          <g aria-hidden pointerEvents="none">
            {endLabels.map(({ n, cx, cy, h, texts }) =>
              texts.map((t, k) => (
                <text key={`${n.id}-${k}`} x={cx} y={cy - h / 2 + 13 + k * 17} textAnchor="middle" className="rt-label rt-rel-label" style={{ fontSize: 13 }}>
                  {t}
                </text>
              )),
            )}
          </g>
        </g>
      </svg>

      <div className="absolute top-4 left-4 z-10">
        <button type="button" onClick={onList} className="rt-switch">
          <IconList aria-hidden className="size-4" /> Show as list
        </button>
      </div>

      {more
        ? (['left', 'right', 'top', 'bottom'] as const).map((side) => {
            const n = more[side].length
            if (n === 0) return null
            const Icon = { left: IconArrowLeft, right: IconArrowRight, top: IconArrowUp, bottom: IconArrowDown }[side]
            const words = { left: 'to the left', right: 'to the right', top: 'above', bottom: 'below' }[side]
            return (
              // goMore runs on click only; the rule cannot see through the flight helper.
              // eslint-disable-next-line react-hooks/refs
              <button key={side} type="button" data-testid={`more-${side}`} className={`rt-more rt-more-${side}`} aria-label={`Show ${n} more ${words}`} onClick={() => goMore(side)}>
                {side === 'left' || side === 'top' ? <Icon aria-hidden className="size-4" /> : null}
                <span>{n} more</span>
                {side === 'right' || side === 'bottom' ? <Icon aria-hidden className="size-4" /> : null}
              </button>
            )
          })
        : null}

      {lineTypes.length > 0 ? (
        <div className="pointer-events-none absolute top-4 right-4 z-10">
          <RelationshipLegend types={lineTypes} />
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2">
        <p className="m-0 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm text-text-muted">
          {crumb.length > 0 ? crumb.join(' › ') : 'Pick a stage to open it. Arrow keys move, Enter opens, Esc closes.'}
        </p>
      </div>
      <p role="status" className="sr-only">
        {status}
        {lines.length > 0 ? ` Showing ${plural(lines.length, 'connection line')}; the page panel lists them.` : ''}
      </p>
    </div>
  )
}
