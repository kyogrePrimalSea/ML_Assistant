import type { Relationship, RelationshipType } from '@/content/types'
import { REL_BY_TYPE } from './relationshipStyles'

export interface LineNode {
  x: number
  y: number
  side: 1 | -1
}

export interface ConnLine {
  key: string
  type: RelationshipType
  from: { key: string } & LineNode
  to: { key: string } & LineNode
  /** Names of the related items this line stands for. */
  names: string[]
  /** Plain name of the selected item the line starts from. */
  fromName: string
  /** True when the related items sit behind a collapsed node, so the endpoint is labelled. */
  hidden: boolean
}

interface PageRef {
  id: string
  stage: string
  family: string
  plain_name: string
}

/** The related page ids for one item, per type (either direction; each counted once). */
export function connectionsOf(relationships: Relationship[], id: string, types?: ReadonlySet<RelationshipType>) {
  const seen = new Set<string>()
  const out: { type: RelationshipType; other: string }[] = []
  for (const r of relationships) {
    if (r.source !== id && r.target !== id) continue
    if (types && !types.has(r.type)) continue
    const other = r.source === id ? r.target : r.source
    if (other === id || seen.has(r.type + other)) continue
    seen.add(r.type + other)
    out.push({ type: r.type, other })
  }
  return out
}

const sk = (stage: string) => `s:${stage}`
const fk = (stage: string, family: string) => `f:${stage}/${family}`
const ik = (id: string) => `i:${id}`

/**
 * Turn the selected item's connections into lines between visible nodes. A target behind a collapsed
 * branch ends at its nearest visible ancestor (family, then stage); related items that share an
 * endpoint and type share one line.
 */
export function resolveLines(
  relationships: Relationship[],
  id: string,
  types: ReadonlySet<RelationshipType>,
  pageById: Map<string, PageRef>,
  nodes: Map<string, LineNode>,
): ConnLine[] {
  const self = pageById.get(id)
  if (!self || types.size === 0) return []
  const resolve = (p: PageRef) => {
    for (const key of [ik(p.id), fk(p.stage, p.family), sk(p.stage)]) {
      const n = nodes.get(key)
      if (n) return { key, ...n }
    }
    return null
  }
  const from = resolve(self)
  if (!from) return []
  const groups = new Map<string, ConnLine>()
  for (const c of connectionsOf(relationships, id, types)) {
    const other = pageById.get(c.other)
    const to = other && resolve(other)
    if (!other || !to || to.key === from.key) continue
    const k = `${c.type}|${to.key}`
    const g = groups.get(k)
    if (g) g.names.push(other.plain_name)
    else groups.set(k, { key: k, type: c.type, from, to, names: [other.plain_name], fromName: self.plain_name, hidden: to.key !== ik(other.id) })
  }
  return [...groups.values()]
}

/** How far (world units) a line runs straight up or down out of its item before bending to the centre. */
export const LIFT = 130

/**
 * A calm cubic curve. It leaves the start vertically, toward the centre's side, so it never runs
 * sideways through the label column, then sweeps in toward the centre and out to the end.
 */
export function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dir = a.y > 0 ? -1 : a.y < 0 ? 1 : -1
  const p1 = { x: a.x, y: a.y + dir * LIFT }
  const p2 = { x: b.x * 0.45, y: b.y * 0.45 }
  const at = (t: number) => {
    const u = 1 - t
    return {
      x: u ** 3 * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * b.x,
      y: u ** 3 * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * b.y,
    }
  }
  return { d: `M${a.x} ${a.y}C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${b.x} ${b.y}`, at, apex: p1 }
}

/** The lines themselves, in world coordinates, drawn under the nodes. No draw-on animation. */
export function RelationshipLines({ lines }: { lines: ConnLine[] }) {
  return (
    <g aria-hidden data-testid="relationship-lines" fill="none" strokeLinecap="butt">
      {lines.map((l) => {
        const s = REL_BY_TYPE[l.type]
        const { d, at } = curve(l.from, l.to)
        const stroke = `var(--${s.token})`
        const m = at(0.88)
        return (
          <g key={l.key} data-rel={l.type} data-to={l.to.key}>
            {s.double ? (
              <>
                <path d={d} stroke={stroke} strokeWidth={4} vectorEffect="non-scaling-stroke" />
                <path d={d} stroke="var(--canvas)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
              </>
            ) : (
              <path d={d} stroke={stroke} strokeWidth={s.width} strokeDasharray={s.dash} vectorEffect="non-scaling-stroke" />
            )}
            {l.type === 'clashes' ? (
              <g transform={`translate(${m.x} ${m.y})`}>
                <g className="rt-glyph">
                  <circle r={7} fill="var(--canvas)" stroke={stroke} strokeWidth={1.5} />
                  <path d="M-4.2 4.2L4.2 -4.2" stroke={stroke} strokeWidth={1.5} />
                </g>
              </g>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

const short = (names: string[]) => {
  const first = names[0].length > 22 ? names[0].slice(0, 21).trimEnd() + '…' : names[0]
  return names.length > 1 ? `${first} +${names.length - 1}` : first
}

/** Labels for lines that end at an ancestor, so the reader knows which item the line stands for. */
export function endpointLabel(l: ConnLine) {
  return `${REL_BY_TYPE[l.type].name}: ${short(l.names)}`
}

export function EndpointLabels({ lines }: { lines: ConnLine[] }) {
  const byNode = new Map<string, ConnLine[]>()
  for (const l of lines) if (l.hidden) byNode.set(l.to.key, [...(byNode.get(l.to.key) ?? []), l])
  return (
    <g aria-hidden pointerEvents="none">
      {[...byNode.values()].map((ls) => {
        const n = ls[0].to
        return (
          <g key={n.key} transform={`translate(${n.x} ${n.y})`}>
            <g className="rt-glyph">
              {ls.map((l, i) => (
                <text
                  key={l.key}
                  data-ann-for={n.key}
                  data-base={n.side * ((n.key.startsWith('s:') ? 20 : 8) + 10)}
                  x={n.side * 130}
                  y={5 + i * 17}
                  textAnchor={n.side > 0 ? 'start' : 'end'}
                  className="rt-label rt-rel-label"
                  style={{ fontSize: '0.8125rem' }}
                >
                  {endpointLabel(l)}
                </text>
              ))}
            </g>
          </g>
        )
      })}
    </g>
  )
}
