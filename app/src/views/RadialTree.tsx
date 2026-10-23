import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { IconBinaryTree2, IconChevronLeft, IconList } from '@tabler/icons-react'
import { line } from 'd3'
import gsap from 'gsap'
import { useIndex } from '@/content/load'
import type { ContentIndex, IndexPage, StageId } from '@/content/types'
import type { RadialLayout, LayoutStage } from '../../scripts/layout-radial.mjs'
import { STAGES } from '@/components/StageBadge'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useShellState } from '@/shell/ShellState'
import { ARCHETYPE_ICONS } from './archetypeIcons'
import CatalogueList from './CatalogueList'
import { fitCamera, type Camera, type FitPoint } from './radialFit'
import { EndpointLabels, RelationshipLines, curve, endpointLabel, resolveLines, type LineNode } from './RelationshipLines'
import { useConnections } from './connections'
import { RelationshipLegend } from './relationshipStyles'
import './radial-tree.css'

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

// ---- helpers ----

const CHAR_PX = 7.8
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const seg = (a: [number, number], b: [number, number]) => line()([a, b])!
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Level = 1 | 2 | 3
interface VNode {
  key: string
  level: Level
  parent: string | null
  x: number
  y: number
  side: 1 | -1
  stage: StageId
  /** The accordion stub standing in for the families that are closed while one family is open. */
  more?: number
}

const sk = (stage: string) => `s:${stage}`
const fk = (stage: string, family: string) => `f:${stage}/${family}`
const ik = (id: string) => `i:${id}`
const mk = (stage: string) => `m:${stage}`

function trackLabel(name: string) {
  return name.replace(/\s*\(.*\)$/, '')
}

// ---- component ----

export default function RadialTree({ activeId }: { activeId?: string }) {
  const { data } = useIndex()
  const { layout, error } = useLayout()
  const { track } = useShellState()
  const [mode, setMode] = useState<'tree' | 'list'>('tree')

  const bar = (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(v) => v && setMode(v as 'tree' | 'list')} aria-label="Tree or list">
        <ToggleGroupItem value="tree" aria-label="Tree" title="Tree" className="h-10 gap-2 bg-surface-1 px-3">
          <IconBinaryTree2 aria-hidden /> Tree
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List" title="List" className="h-10 gap-2 bg-surface-1 px-3">
          <IconList aria-hidden /> List
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )

  if (mode === 'list') {
    return (
      <div className="relative h-full">
        {bar}
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 pt-20 pb-6">
            <CatalogueList activeId={activeId} />
          </div>
        </div>
      </div>
    )
  }

  const stages = layout?.tracks[track]
  return (
    <div className="relative h-full">
      {bar}
      {error ? (
        <p className="p-6 pt-20 text-block-text">Could not load the tree layout. Try reloading, or use the list.</p>
      ) : !data || !layout || !stages ? (
        <p className="p-6 pt-20 text-text-muted">Loading the tree…</p>
      ) : (
        <Canvas key={track} data={data} layout={layout} stages={stages} track={track} activeId={activeId} />
      )}
    </div>
  )
}

function Canvas({
  data,
  layout,
  stages,
  track,
  activeId,
}: {
  data: ContentIndex
  layout: RadialLayout
  stages: LayoutStage[]
  track: string
  activeId?: string
}) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const camRef = useRef<SVGGElement>(null)
  const countsRef = useRef<SVGGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 640 })
  const [openStage, setOpenStage] = useState<StageId | null>(null)
  const [openFamily, setOpenFamily] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(sk(stages[0].id))
  const wantFocus = useRef(false)
  const [syncedId, setSyncedId] = useState<string | undefined>(undefined)

  const pageById = useMemo(() => new Map(data.pages.map((p) => [p.id, p])), [data])
  const stageName = useMemo(() => new Map(data.vocab.stages.map((s) => [s.id, s.name])), [data])
  const archName = useMemo(() => new Map(data.vocab.archetypes.map((a) => [a.id, a.name])), [data])
  const trackName = data.vocab.tracks.find((t) => t.id === track)?.name ?? track

  // A page opened from elsewhere (link, search, reload) opens its branch.
  if (activeId !== syncedId) {
    setSyncedId(activeId)
    const page = activeId ? pageById.get(activeId) : undefined
    if (page && page.tracks.includes(track as never)) {
      setOpenStage(page.stage)
      setOpenFamily(page.family)
      setFocusKey(ik(page.id))
    }
  }

  // Visible nodes in tree order (stages, then the open stage's families, then the open family's items).
  const vis = useMemo(() => {
    const out: VNode[] = []
    for (const s of stages) {
      out.push({ key: sk(s.id), level: 1, parent: null, x: s.x, y: s.y, side: s.side, stage: s.id as StageId })
      if (s.id !== openStage) continue
      for (const f of s.families) {
        if (openFamily && f.name !== openFamily) continue
        out.push({ key: fk(s.id, f.name), level: 2, parent: sk(s.id), x: f.x, y: f.y, side: s.side, stage: s.id as StageId })
        if (f.name !== openFamily) continue
        for (const it of f.items) out.push({ key: ik(it.id), level: 3, parent: fk(s.id, f.name), x: it.x, y: it.y, side: s.side, stage: s.id as StageId })
        if (s.families.length > 1) out.push({ key: mk(s.id), level: 2, parent: sk(s.id), x: f.x, y: f.y, side: s.side, stage: s.id as StageId, more: s.families.length - 1 })
      }
    }
    return out
  }, [stages, openStage, openFamily])

  const info = useCallback(
    (v: VNode) => {
      if (v.level === 1) {
        const s = stages.find((x) => x.id === v.stage)!
        return { name: stageName.get(v.stage) ?? v.stage, short: stageName.get(v.stage) ?? v.stage, count: s.count, page: undefined as IndexPage | undefined }
      }
      if (v.more !== undefined) {
        const name = `${v.more} other ${v.more === 1 ? 'family' : 'families'}`
        return { name, short: `+${name}`, count: v.more, page: undefined }
      }
      if (v.level === 2) {
        const f = stages.find((x) => x.id === v.stage)!.families.find((x) => fk(v.stage, x.name) === v.key)!
        return { name: f.name, short: clip(f.name, 26), count: f.count, page: undefined }
      }
      const page = pageById.get(v.key.slice(2))!
      return { name: page.plain_name, short: clip(page.plain_name, 30), count: 0, page }
    },
    [stages, stageName, pageById],
  )

  // Connection lines for the selected page: only the types switched on in the panel.
  const { on } = useConnections()
  const lines = useMemo(() => {
    if (!activeId || on.size === 0) return []
    const nodes = new Map<string, LineNode>(vis.map((v) => [v.key, { x: v.x, y: v.y, side: v.side }]))
    return resolveLines(data.relationships, activeId, on, pageById, nodes)
  }, [activeId, on, vis, data, pageById])
  const lineTypes = useMemo(() => [...new Set(lines.map((l) => l.type))], [lines])
  const endNodes = useMemo(() => new Set(lines.flatMap((l) => [l.from.key, l.to.key])), [lines])

  // Camera target: fit the opened branch (all stages when nothing is open) with node and label reach.
  const target: Camera = useMemo(() => {
    const reach = (v: VNode): FitPoint => {
      const i = info(v)
      const r = v.level === 1 ? 20 : v.more !== undefined ? 5 : v.level === 2 ? 9 : 12
      const text = r + 10 + (i.short.length + (v.level < 3 && v.more === undefined ? 4 : 0)) * CHAR_PX
      return { x: v.x, y: v.y, l: v.side < 0 ? text : r, r: v.side > 0 ? text : r, t: 14, b: v.more !== undefined ? 40 : 14 }
    }
    const branch = openFamily ? vis.filter((v) => v.level > 1) : openStage ? vis.filter((v) => v.level > 1 || v.stage === openStage) : vis
    const pts = branch.map(reach)
    // With the siblings folded away the branch is small; keep the ring in view so it never zooms past it.
    if (openFamily) for (const v of vis) if (v.level === 1 && v.stage !== openStage) pts.push({ x: v.x, y: v.y, l: 22, r: 22, t: 22, b: 22 })
    // Lines that end outside the opened branch pull the camera back so every endpoint and its label stay in view.
    for (const l of lines) {
      const apex = curve(l.from, l.to).apex
      pts.push({ x: apex.x, y: apex.y, l: 0, r: 0, t: 0, b: 0 })
      for (const n of [l.from, l.to]) {
        const v = vis.find((x) => x.key === n.key)
        if (v && !branch.includes(v)) pts.push(reach(v))
        if (l.hidden && n === l.to) {
          const w = 34 + (n.key === sk(openStage ?? '') ? 12 * CHAR_PX : 0) + (endpointLabel(l).length + 1) * 6.6
          pts.push({ x: n.x, y: n.y, l: n.side < 0 ? w : 14, r: n.side > 0 ? w : 14, t: 14, b: 14 })
        }
      }
    }
    if (!openStage) pts.push({ x: 0, y: 0, l: 50, r: 50, t: 50, b: 80 })
    return fitCamera(pts, size.w, size.h, { l: 28, r: 28, t: lines.length > 0 ? 156 : 84, b: 64 }, !openStage, lines.length > 0 ? 0.15 : undefined)
  }, [vis, info, openStage, openFamily, size, lines])

  // Apply the camera: a flight for branch changes; a jump on first paint and with reduced motion.
  const cam = useRef<Camera | null>(null)
  const labelPx = useRef(new Map<string, number>())
  const tween = useRef<gsap.core.Tween | null>(null)
  const apply = useCallback((c: Camera) => {
    camRef.current?.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.kx} ${c.ky})`)
    svgRef.current?.style.setProperty('--rt-ix', String(1 / c.kx))
    svgRef.current?.style.setProperty('--rt-iy', String(1 / c.ky))
    // A trunk starts after its node's label and count, which have a fixed screen width.
    for (const el of svgRef.current?.querySelectorAll<SVGPathElement>('[data-trunk]') ?? []) {
      const t = JSON.parse(el.dataset.trunk!) as { from: string; x: number; y: number; to: number; side: number; r: number }
      const start = t.x + (t.side * (t.r + 10 + (labelPx.current.get(t.from) ?? 0))) / c.kx
      const ok = t.side * (t.to - start) > 0
      el.setAttribute('d', ok ? seg([start, t.y], [t.to, t.y]) : '')
    }
  }, [])
  useLayoutEffect(() => {
    tween.current?.kill()
    if (!cam.current || reducedMotion()) {
      cam.current = { ...target }
      apply(cam.current)
      return
    }
    const cur = cam.current
    const dist = Math.hypot(target.x - cur.x, target.y - cur.y) + (Math.abs(target.kx - cur.kx) + Math.abs(target.ky - cur.ky)) * 400
    const duration = Math.min(0.9, Math.max(0.6, 0.6 + dist / 4000))
    tween.current = gsap.to(cur, { x: target.x, y: target.y, kx: target.kx, ky: target.ky, duration, ease: 'power4.out', onUpdate: () => apply(cur) })
    return () => {
      tween.current?.kill()
    }
  }, [target, apply])

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // With a family open, its label rides above its node so the items beside it stay clear.
  const raisedKey = openStage && openFamily ? fk(openStage, openFamily) : null

  // Put each count right after its label's real width.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    for (const t of svg.querySelectorAll<SVGTextElement>('[data-count-for]')) {
      const key = t.dataset.countFor!
      const label = svg.querySelector<SVGTextElement>(`[data-key="${CSS.escape(key)}"] text`)
      const len = label && 'getComputedTextLength' in label ? label.getComputedTextLength() : 0
      if (len <= 0) continue
      const base = Number(t.dataset.base)
      t.setAttribute('x', String(base + Math.sign(base) * (len + 8)))
      labelPx.current.set(key, key === raisedKey ? 0 : len + 8 + t.getComputedTextLength() + 10)
    }
    // Endpoint labels continue the row after a node's own label and count.
    for (const t of svg.querySelectorAll<SVGTextElement>('[data-ann-for]')) {
      const px = t.dataset.annFor === (openStage ? sk(openStage) : '') || !t.dataset.annFor!.startsWith('s:') ? (labelPx.current.get(t.dataset.annFor!) ?? 0) : 0
      const base = Number(t.dataset.base)
      t.setAttribute('x', String(base + Math.sign(base) * Math.max(0, px - 4)))
    }
    if (cam.current) apply(cam.current)
  }, [vis, apply, lines, raisedKey, openStage])

  // Keyboard focus follows state changes made by keys.
  useEffect(() => {
    if (!wantFocus.current) return
    wantFocus.current = false
    svgRef.current?.querySelector<SVGGElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus()
  }, [focusKey, vis])

  const toggleStage = (id: StageId) => {
    setOpenFamily(null)
    setOpenStage((cur) => (cur === id ? null : id))
  }
  const toggleFamily = (name: string) => setOpenFamily((cur) => (cur === name ? null : name))
  const activate = (v: VNode) => {
    if (v.level === 1) {
      if (stages.find((s) => s.id === v.stage)!.count > 0) toggleStage(v.stage)
    } else if (v.more !== undefined) setOpenFamily(null)
    else if (v.level === 2) toggleFamily(info(v).name)
    else navigate(`/page/${v.key.slice(2)}`)
  }

  const move = (key: string) => {
    wantFocus.current = true
    setFocusKey(key)
  }

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const v = vis.find((n) => n.key === focusKey)
    if (!v) return
    const sibs = vis.filter((n) => n.parent === v.parent && n.level === v.level)
    const at = sibs.indexOf(v)
    const isOpen = (n: VNode) => (n.level === 1 ? n.stage === openStage : n.level === 2 && info(n).name === openFamily)
    const hasKids = (n: VNode) => n.level === 1 ? stages.find((s) => s.id === n.stage)!.count > 0 : n.level === 2
    let handled = true
    if (v.more !== undefined && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      if ((e.key === 'ArrowRight') !== (v.side > 0) && v.parent) move(v.parent)
      e.preventDefault()
      e.stopPropagation()
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        if (sibs[at + 1]) move(sibs[at + 1].key)
        break
      case 'ArrowUp':
        if (sibs[at - 1]) move(sibs[at - 1].key)
        break
      case 'Home':
        move(sibs[0].key)
        break
      case 'End':
        move(sibs[sibs.length - 1].key)
        break
      case 'ArrowRight':
      case 'ArrowLeft': {
        // Columns bloom toward the node's side; "outward" is the arrow pointing that way.
        const outward = (e.key === 'ArrowRight') === (v.side > 0)
        if (outward) {
          if (v.level < 3 && hasKids(v)) {
            if (!isOpen(v)) {
              if (v.level === 1) toggleStage(v.stage)
              else toggleFamily(info(v).name)
              wantFocus.current = true
            } else {
              const kid = vis.find((n) => n.parent === v.key)
              if (kid) move(kid.key)
            }
          }
        } else if (v.level < 3 && isOpen(v)) {
          if (v.level === 1) toggleStage(v.stage)
          else toggleFamily(info(v).name)
          wantFocus.current = true
        } else if (v.parent) move(v.parent)
        break
      }
      case 'Enter':
      case ' ':
        activate(v)
        wantFocus.current = true
        break
      case 'Escape':
        if (openFamily) {
          const fam = vis.find((n) => n.level === 2 && info(n).name === openFamily)
          setOpenFamily(null)
          if (fam) move(fam.key)
        } else if (openStage) {
          setOpenStage(null)
          move(sk(openStage))
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

  // Links: centre to stages, then one trunk, spine and ticks per open column. Trunks run under the
  // node's label (labels sit on the line), so no connector ever crosses text.
  const links = useMemo(() => {
    const out: { d: string; stage: StageId | null; key: string; trunk?: { from: string; x: number; y: number; to: number; side: number; r: number } }[] = []
    for (const s of stages) out.push({ d: seg([0, 0], [s.x, s.y]), stage: null, key: `c-${s.id}` })
    const stage = stages.find((s) => s.id === openStage)
    if (stage && stage.families.length > 0) {
      const sx = stage.side * (layout.familyX - layout.spine)
      const id = stage.id as StageId
      const shown = stage.families.filter((f) => !openFamily || f.name === openFamily)
      const ys = shown.map((f) => f.y)
      out.push({ d: seg([stage.x, stage.y], [sx, stage.y]), stage: id, key: 'trunk-stage', trunk: { from: sk(stage.id), x: stage.x, y: stage.y, to: sx, side: stage.side, r: 20 } })
      out.push({ d: seg([sx, Math.min(...ys)], [sx, Math.max(...ys)]), stage: null, key: 'spine-f' })
      for (const f of shown) out.push({ d: seg([sx, f.y], [f.x, f.y]), stage: f.name === openFamily ? id : null, key: `tick-${f.name}` })
      const fam = stage.families.find((f) => f.name === openFamily)
      if (fam) {
        const ix = stage.side * (layout.itemX - layout.spine)
        const iy = fam.items.map((i) => i.y)
        out.push({ d: seg([fam.x, fam.y], [ix, fam.y]), stage: id, key: 'trunk-family', trunk: { from: fk(stage.id, fam.name), x: fam.x, y: fam.y, to: ix, side: stage.side, r: 8 } })
        out.push({ d: seg([ix, Math.min(...iy)], [ix, Math.max(...iy)]), stage: null, key: 'spine-i' })
        for (const it of fam.items) out.push({ d: seg([ix, it.y], [it.x, it.y]), stage: null, key: `tick-${it.id}` })
      }
    }
    return out
  }, [stages, layout, openStage, openFamily])

  const openStageData = stages.find((s) => s.id === openStage)
  const crumb = openStage ? [stageName.get(openStage) ?? openStage, ...(openFamily ? [openFamily] : [])] : []
  const status = openStage
    ? openFamily
      ? `${openFamily} open, ${plural(openStageData?.families.find((f) => f.name === openFamily)?.count ?? 0, 'page')}.`
      : `${stageName.get(openStage)} stage open, ${plural(openStageData?.families.length ?? 0, 'family', 'families')}.`
    : 'All stages shown.'

  const treeFocus = vis.some((n) => n.key === focusKey) ? focusKey : sk(stages[0].id)

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        role="tree"
        aria-label={`${trackLabel(trackName)} pages by stage, family and page`}
        className="rt-svg absolute inset-0 size-full"
        data-conn={lines.length > 0 ? 'on' : undefined}
        onKeyDown={onKeyDown}
      >
        <g ref={camRef}>
          <g aria-hidden>
            {links.map((l) => (
              <path
                key={l.key}
                d={l.d}
                data-trunk={l.trunk ? JSON.stringify(l.trunk) : undefined} className={l.stage ? 'rt-link rt-link-hot rt-fade' : 'rt-link'} style={l.stage ? ({ '--rt-stage': `var(--stage-${l.stage})` } as React.CSSProperties) : undefined} />
            ))}
          </g>

          <RelationshipLines lines={lines} />

          <g aria-hidden>
            <g className="rt-glyph">
              <circle r={40} fill="var(--surface-1)" stroke="var(--accent)" strokeWidth={2.5} />
              <IconBinaryTree2 x={-14} y={-14} size={28} color="var(--accent-strong)" />
              <text y={66} textAnchor="middle" className="rt-label" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                {trackLabel(trackName)}
              </text>
            </g>
          </g>

          {vis.map((v) => {
            const i = info(v)
            const dimmed = v.level === 1 && openStage && v.stage !== openStage
            const color = `var(--stage-${v.stage})`
            const expanded = v.level === 1 ? v.stage === openStage : v.more !== undefined ? undefined : v.level === 2 ? i.name === openFamily : undefined
            const disabled = v.level === 1 && i.count === 0
            const written = i.page?.has_record !== false
            const ArchIcon = i.page ? ARCHETYPE_ICONS[i.page.archetype] : null
            const StageIcon = STAGES[v.stage].Icon
            const r = v.level === 1 ? 20 : v.more !== undefined ? 5 : v.level === 2 ? 8 : 12
            const labelX = v.side * (r + 10)
            const anchor = v.side > 0 ? 'start' : 'end'
            const hit = r + 16 + (i.short.length + 4) * CHAR_PX
            const sibs = vis.filter((n) => n.parent === v.parent && n.level === v.level)
            const label =
              v.level === 1
                ? `${i.name} stage, ${plural(i.count, 'page')}`
                : v.more !== undefined
                  ? `Show ${i.name}`
                  : v.level === 2
                  ? `${i.name} family, ${plural(i.count, 'page')}`
                  : `${i.name}, ${archName.get(i.page!.archetype) ?? i.page!.archetype}${written ? '' : ', not written yet'}`
            return (
              <g
                key={v.key}
                role="treeitem"
                data-key={v.key}
                data-active={i.page && i.page.id === activeId ? 'true' : undefined}
                data-end={endNodes.has(v.key) ? 'true' : undefined}
                aria-label={label}
                aria-level={v.level}
                aria-setsize={sibs.length}
                aria-posinset={sibs.indexOf(v) + 1}
                aria-expanded={expanded}
                aria-selected={i.page ? i.page.id === activeId : undefined}
                aria-disabled={disabled || undefined}
                tabIndex={v.key === treeFocus ? 0 : -1}
                className={`rt-node${v.level > 1 ? ' rt-fade' : ''}`}
                style={{ '--rt-stage': color, opacity: disabled ? 0.55 : 1 } as React.CSSProperties}
                transform={`translate(${v.x} ${v.y})`}
                onFocus={() => setFocusKey(v.key)}
                onClick={() => {
                  setFocusKey(v.key)
                  activate(v)
                }}
              >
                <rect x={v.side > 0 ? -r - 8 : -hit} y={-15} width={hit + r + 8} height={30} fill="transparent" />
                <g className="rt-glyph">
                  <g transform={v.more !== undefined ? 'translate(0 26)' : undefined}>
                  <circle className="rt-focus" r={r + 5} />
                  <circle
                    className="rt-disc"
                    r={r}
                    stroke={color}
                    strokeWidth={v.level === 1 ? 2.5 : 2}
                    strokeDasharray={written ? undefined : '3 2.5'}
                  />
                  {v.level === 1 ? (
                    <g transform="translate(-11 -11)" style={{ color }}>
                      <StageIcon className="size-[22px]" aria-hidden />
                    </g>
                  ) : ArchIcon ? (
                    <g transform="translate(-8 -8)" style={{ color, opacity: written ? 1 : 0.65 }}>
                      <ArchIcon className="size-4" aria-hidden />
                    </g>
                  ) : null}
                  <text
                    x={labelX}
                    y={v.key === raisedKey ? -19 : 5}
                    textAnchor={anchor}
                    className={`rt-label${written && v.more === undefined ? '' : ' rt-label-muted'}${dimmed ? ' rt-dim' : ''}`}
                    style={{ fontSize: v.level === 1 ? '1rem' : '0.9375rem', fontWeight: v.level < 3 && v.more === undefined ? 700 : 400, fontStyle: written ? undefined : 'italic' }}
                  >
                    {i.short}
                    {i.short !== i.name ? <title>{i.name}</title> : null}
                  </text>
                  </g>
                </g>
              </g>
            )
          })}

          <EndpointLabels lines={lines} />

          {/* Page counts follow each label, outside the tree items, so a node's visible text is
              exactly its name. Their x is corrected to the measured label width after render. */}
          <g aria-hidden pointerEvents="none" ref={countsRef}>
            {vis
              .filter((v) => v.level < 3 && v.more === undefined)
              .map((v) => {
                const r = v.level === 1 ? 20 : 8
                const dim = v.level === 1 && openStage && v.stage !== openStage
                return (
                  <g key={v.key} transform={`translate(${v.x} ${v.y})`} opacity={info(v).count === 0 && v.level === 1 ? 0.55 : 1}>
                    <g className="rt-glyph">
                      <text
                        data-count-for={v.key}
                        data-base={v.side * (r + 10)}
                        x={v.side * (r + 10 + (info(v).short.length + 1) * CHAR_PX + 4)}
                        y={v.key === raisedKey ? -19 : 5}
                        textAnchor={v.side > 0 ? 'start' : 'end'}
                        className={`rt-label rt-label-muted${dim ? ' rt-dim' : ''}`}
                        style={{ fontSize: '0.875rem' }}
                      >
                        {info(v).count}
                      </text>
                    </g>
                  </g>
                )
              })}
          </g>
        </g>
      </svg>

      {lineTypes.length > 0 ? (
        <div className="pointer-events-none absolute top-4 right-4 z-10">
          <RelationshipLegend types={lineTypes} />
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2">
        {crumb.length > 0 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="pointer-events-auto bg-surface-1"
              onClick={() => {
                setOpenStage(null)
                setOpenFamily(null)
              }}
            >
              <IconChevronLeft aria-hidden /> All stages
            </Button>
            <p className="m-0 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm font-bold">{crumb.join(' › ')}</p>
          </>
        ) : (
          <p className="m-0 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm text-text-muted">
            Pick a stage to open it. Arrow keys move, Enter opens, Esc closes.
          </p>
        )}
      </div>
      <p role="status" className="sr-only">
        {status}
        {lines.length > 0 ? ` Showing ${plural(lines.length, 'connection line')}; the page panel lists them.` : ''}
      </p>
    </div>
  )
}
