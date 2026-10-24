// Radial tree, interim adapter (T038). Draws the stored per-goal layout (scripts/layout-radial.mjs):
// the nine-stage ring, and for the opened path each opened node's children fanned out from it.
// Plain on purpose: T039 rewrites the rendering (Names/Questions labels, centre prompt, link style,
// dimming, camera flight). Nothing here computes geometry; the camera only scales the stored fit box.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { IconBinaryTree2, IconList } from '@tabler/icons-react'
import { useIndex } from '@/content/load'
import type { ContentIndex, TaxGoal, TaxNode } from '@/content/types'
import { METRICS, wrapText, type GoalLayout, type LayoutNode, type RadialLayout } from '../../scripts/layout-radial-core.mjs'
import { STAGES, type Stage } from '@/components/StageBadge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useShellState } from '@/shell/ShellState'
import { ARCHETYPE_ICONS } from './archetypeIcons'
import CatalogueList from './CatalogueList'
import { RelationshipLines, endpointLabel, resolveLines, type LineNode } from './RelationshipLines'
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

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const sk = (stage: string) => `s:${stage}`
const fk = (stage: string, id: string) => `f:${stage}/${id}`
const ik = (id: string) => `i:${id}`
const keyOf = (n: LayoutNode, stage?: string) => (n.level === 'stage' ? sk(n.id) : n.level === 'page' ? ik(n.id) : fk(stage ?? '', n.id))

/** Where a node sits in the goal view. */
interface Info {
  node: TaxNode
  parent: string | null
  stage: Stage
}

const nameOf = (n: TaxNode) => (n.level === 'page' ? n.shown_as : n.names_label) ?? n.id

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

  // The goal follows the track selector until the goal picker lands: the first goal on the track
  // (Standard gives predict-number, Time series gives forecast).
  const goal = data?.taxonomy?.goals.find((g) => g.track === track) ?? data?.taxonomy?.goals[0]
  const goalLayout = goal ? layout?.goals[goal.id] : undefined
  return (
    <div className="relative h-full">
      {bar}
      {error ? (
        <p className="p-6 pt-20 text-block-text">Could not load the tree layout. Try reloading, or use the list.</p>
      ) : !data || !layout || !goal || !goalLayout ? (
        <p className="p-6 pt-20 text-text-muted">Loading the tree…</p>
      ) : (
        <Canvas key={goal.id} data={data} goal={goal} layout={goalLayout} activeId={activeId} />
      )}
    </div>
  )
}

function Canvas({ data, goal, layout, activeId }: { data: ContentIndex; goal: TaxGoal; layout: GoalLayout; activeId?: string }) {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 640 })
  const [openId, setOpenId] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(layout.ring[0].id)
  const wantFocus = useRef(false)
  const [syncedId, setSyncedId] = useState<string | undefined>(undefined)

  const view = data.taxonomy.views[goal.id]
  const info = useMemo(() => indexView(view), [view])
  const pageById = useMemo(() => new Map(data.pages.map((p) => [p.id, p])), [data])
  const archName = useMemo(() => new Map(data.vocab.archetypes.map((a) => [a.id, a.name])), [data])

  // A page opened from elsewhere (link, search, reload) opens its branch.
  if (activeId !== syncedId) {
    setSyncedId(activeId)
    const at = activeId ? info.get(activeId) : undefined
    if (at?.parent) {
      setOpenId(at.parent)
      setFocusKey(activeId!)
    }
  }

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
      const side = n.anchor === 'start' ? 1 : -1
      nodes.set(keyOf(n, info.get(n.id)!.stage), { x: n.x, y: n.y, side })
    }
    return resolveLines(data.relationships, activeId, on, pageById, nodes)
  }, [activeId, on, shown, info, data, pageById])
  const lineTypes = useMemo(() => [...new Set(lines.map((l) => l.type))], [lines])
  const endNodes = useMemo(() => new Set(lines.flatMap((l) => [l.from.key, l.to.key])), [lines])

  // A line that ends at a collapsed branch is labelled beside that node, after its name and count.
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
    return [...byKey.values()].map(({ n, texts }) => {
      const m = METRICS[n.level === 'stage' ? 'stage' : 'node']
      const ls = wrapText(nameOf(info.get(n.id)!.node), m.wrap)
      const lh = m.font * METRICS.lineHeight
      const sign = n.anchor === 'start' ? 1 : -1
      const w = Math.max(...ls.map((l) => l.length)) * m.font * (m.bold ? METRICS.boldEm : METRICS.regularEm)
      const x = n.x + sign * (n.r + METRICS.gap + METRICS.padX / 2 + w + 8 + 30)
      const y = n.y - (ls.length * lh) / 2 + lh * 0.78 - (n.empty ? lh / 2 : 0) + (ls.length - 1) * lh
      return { n, sign, x, y, texts, width: Math.max(...texts.map((t) => t.length)) * 13 * METRICS.regularEm }
    })
  }, [lines, shown, info])

  // Camera: scale and centre the stored fit box of the opened path.
  const cam = useMemo(() => {
    const box = layout.fits[openId ?? 'root'] ?? layout.fits.root
    const pad = { l: 28, r: 28, t: lines.length > 0 ? 156 : 84, b: 64 }
    let { x0, y0, x1, y1 } = box
    for (const e of endLabels) {
      x0 = Math.min(x0, e.sign > 0 ? e.x : e.x - e.width)
      x1 = Math.max(x1, e.sign > 0 ? e.x + e.width : e.x)
      y0 = Math.min(y0, e.y - 16)
      y1 = Math.max(y1, e.y + e.texts.length * 17)
    }
    const bw = x1 - x0
    const bh = y1 - y0
    const k = Math.min(1.2, Math.max(0.2, Math.min((size.w - pad.l - pad.r) / bw, (size.h - pad.t - pad.b) / bh)))
    return {
      k,
      x: pad.l + (size.w - pad.l - pad.r - bw * k) / 2 - x0 * k,
      y: pad.t + (size.h - pad.t - pad.b - bh * k) / 2 - y0 * k,
    }
  }, [layout, openId, size, lines.length, endLabels])

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

  // Keyboard focus follows state changes made by keys.
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!wantFocus.current) return
    wantFocus.current = false
    svgRef.current?.querySelector<SVGGElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus()
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
  }

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (!pos.has(focusKey)) return
    const sibs = siblingsOf(focusKey)
    const at = sibs.indexOf(focusKey)
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
        if (hasKids(focusKey)) {
          if (!isOpen(focusKey)) {
            toggle(focusKey)
            wantFocus.current = true
          } else move(layout.fans[focusKey].children[0].id)
        }
        break
      case 'ArrowLeft':
        if (isOpen(focusKey)) {
          toggle(focusKey)
          wantFocus.current = true
        } else if (info.get(focusKey)?.parent) move(info.get(focusKey)!.parent!)
        break
      case 'Enter':
      case ' ':
        activate(focusKey)
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

  const treeFocus = pos.has(focusKey) ? focusKey : layout.ring[0].id
  const crumb = path.map((id) => nameOf(info.get(id)!.node))
  const status = openId
    ? `${nameOf(info.get(openId)!.node)} open, ${plural(layout.fans[openId].children.length, 'item')}.`
    : 'All stages shown.'

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        role="tree"
        aria-label={`${goal.names_label} pages by stage, group, family and page`}
        className="rt-svg absolute inset-0 size-full"
        data-conn={lines.length > 0 ? 'on' : undefined}
        onKeyDown={onKeyDown}
      >
        <g className="rt-cam" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})`, transitionDuration: reducedMotion() ? '0s' : undefined }}>
          <g aria-hidden>
            {layout.ring.map((n) => (
              <path key={`c-${n.id}`} d={`M0 0L${n.x} ${n.y}`} className="rt-link" />
            ))}
            {shown
              .filter((s) => s.parent)
              .map(({ n, parent }) => {
                const p = pos.get(parent!)!
                return <path key={`l-${n.id}`} d={`M${p.x} ${p.y}L${n.x} ${n.y}`} className="rt-link rt-link-hot" style={{ '--rt-stage': `var(--stage-${info.get(n.id)!.stage})` } as React.CSSProperties} />
              })}
          </g>

          <RelationshipLines lines={lines} />

          <g aria-hidden>
            <circle r={40} fill="var(--surface-1)" stroke="var(--accent)" strokeWidth={2.5} />
            <IconBinaryTree2 x={-14} y={-14} size={28} color="var(--accent-strong)" />
            <text y={66} textAnchor="middle" className="rt-label" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
              {goal.names_label}
            </text>
          </g>

          {shown.map(({ n }) => {
            const i = info.get(n.id)!
            const node = i.node
            const page = node.level === 'page' ? pageById.get(n.id) : undefined
            const written = node.level !== 'page' || page?.has_record !== false
            const color = `var(--stage-${i.stage})`
            const dimmed = n.level === 'stage' && openId !== null && n.id !== path[0]
            const StageIcon = STAGES[i.stage].Icon
            const ArchIcon = page ? ARCHETYPE_ICONS[page.archetype] : null
            const m = METRICS[n.level === 'stage' ? 'stage' : n.level === 'page' ? 'page' : 'node']
            const lines2 = wrapText(nameOf(node), m.wrap)
            const lh = m.font * METRICS.lineHeight
            const sign = n.anchor === 'start' ? 1 : -1
            const tx = sign * (n.r + METRICS.gap + METRICS.padX / 2)
            const labelY = -(lines2.length * lh) / 2 + lh * 0.78 - (n.empty ? lh / 2 : 0)
            const kids = hasKids(n.id)
            const expanded = n.level === 'page' ? undefined : kids ? isOpen(n.id) : undefined
            const label =
              node.level === 'page'
                ? `${nameOf(node)}, ${archName.get(page?.archetype ?? 'model') ?? page?.archetype}${written ? '' : ', not written yet'}`
                : `${nameOf(node)} ${node.level}, ${plural(n.count, 'page')}`
            const sibs = siblingsOf(n.id)
            return (
              <g
                key={n.id}
                role="treeitem"
                data-key={n.id}
                data-active={page && n.id === activeId ? 'true' : undefined}
                data-end={endNodes.has(keyFor(n)) ? 'true' : undefined}
                aria-label={label}
                aria-level={path.indexOf(i.parent ?? '') + 2}
                aria-setsize={sibs.length}
                aria-posinset={sibs.indexOf(n.id) + 1}
                aria-expanded={expanded}
                aria-selected={page ? n.id === activeId : undefined}
                aria-disabled={n.empty || undefined}
                tabIndex={n.id === treeFocus ? 0 : -1}
                className={`rt-node${n.level !== 'stage' ? ' rt-fade' : ''}`}
                style={{ '--rt-stage': color, opacity: n.empty ? 0.55 : dimmed ? 0.6 : 1 } as React.CSSProperties}
                transform={`translate(${n.x} ${n.y})`}
                onFocus={() => setFocusKey(n.id)}
                onClick={() => {
                  setFocusKey(n.id)
                  activate(n.id)
                }}
              >
                <rect x={sign > 0 ? -n.r : -n.r - METRICS.gap - n.w} y={-n.h / 2} width={n.r * 2 + METRICS.gap + n.w} height={n.h} fill="transparent" />
                <circle className="rt-focus" r={n.r + 5} />
                <circle className="rt-disc" r={n.r} stroke={color} strokeWidth={n.level === 'stage' ? 2.5 : 2} strokeDasharray={written ? undefined : '3 2.5'} />
                {n.level === 'stage' ? (
                  <g transform="translate(-11 -11)" style={{ color }}>
                    <StageIcon className="size-[22px]" aria-hidden />
                  </g>
                ) : ArchIcon ? (
                  <g transform="translate(-8 -8)" style={{ color, opacity: written ? 1 : 0.65 }}>
                    <ArchIcon className="size-4" aria-hidden />
                  </g>
                ) : null}
                <text
                  x={tx}
                  y={labelY}
                  textAnchor={n.anchor}
                  className={`rt-label${written ? '' : ' rt-label-muted'}`}
                  style={{ fontSize: m.font, fontWeight: m.bold ? 700 : 400, fontStyle: written ? undefined : 'italic' }}
                >
                  {lines2.map((l, k) => (
                    <tspan key={k} x={tx} dy={k === 0 ? 0 : lh}>
                      {k < lines2.length - 1 ? `${l} ` : l}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}

          {/* Page counts and the "Not used" note sit outside the tree items, so an item's visible text is
              exactly its name (accessible-name rule). */}
          <g aria-hidden pointerEvents="none">
            {shown.map(({ n }) => {
              const node = info.get(n.id)!.node
              const m = METRICS[n.level === 'stage' ? 'stage' : n.level === 'page' ? 'page' : 'node']
              const ls = wrapText(nameOf(node), m.wrap)
              const lh = m.font * METRICS.lineHeight
              const sign = n.anchor === 'start' ? 1 : -1
              const tx = sign * (n.r + METRICS.gap + METRICS.padX / 2)
              const y0 = -(ls.length * lh) / 2 + lh * 0.78 - (n.empty ? lh / 2 : 0)
              const lastW = Math.max(...ls.map((l) => l.length)) * m.font * (m.bold ? METRICS.boldEm : METRICS.regularEm)
              return (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} opacity={n.empty ? 0.55 : n.level === 'stage' && openId !== null && n.id !== path[0] ? 0.6 : 1}>
                  {n.level !== 'page' ? (
                    <text x={tx + sign * (lastW + 8)} y={y0 + (ls.length - 1) * lh} textAnchor={n.anchor} className="rt-label rt-label-muted" style={{ fontSize: m.font - 1 }}>
                      {n.count}
                    </text>
                  ) : null}
                  {n.empty ? (
                    <text x={tx} y={y0 + ls.length * lh} textAnchor={n.anchor} className="rt-label rt-label-muted" style={{ fontSize: METRICS.note.font }}>
                      {METRICS.note.text}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>

          <g aria-hidden pointerEvents="none">
            {endLabels.map(({ n, sign, x, y, texts }) =>
              texts.map((t, k) => (
                <text key={`${n.id}-${k}`} x={x} y={y + k * 17} textAnchor={sign > 0 ? 'start' : 'end'} className="rt-label rt-rel-label" style={{ fontSize: 13 }}>
                  {t}
                </text>
              )),
            )}
          </g>
        </g>
      </svg>

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
