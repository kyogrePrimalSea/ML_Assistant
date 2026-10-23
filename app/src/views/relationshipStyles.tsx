import type { ComponentType } from 'react'
import { IconArrowsExchange, IconBan, IconHeartHandshake, IconPlugConnected, IconThumbUp } from '@tabler/icons-react'
import type { RelationshipType } from '@/content/types'

/** Spec 10.5: dash pattern is the primary cue, colour the secondary cue, icon in every legend and toggle. */
export interface RelStyle {
  type: RelationshipType
  name: string
  token: string
  dash?: string
  width: number
  double?: boolean
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

export const REL_STYLES: RelStyle[] = [
  { type: 'needs', name: 'Needs', token: 'rel-needs', width: 2, Icon: IconPlugConnected },
  { type: 'recommended', name: 'Recommended', token: 'rel-recommended', dash: '6 4', width: 2, Icon: IconThumbUp },
  { type: 'clashes', name: 'Clashes', token: 'rel-clashes', dash: '2 4', width: 2, Icon: IconBan },
  { type: 'alternative_to', name: 'Alternative to', token: 'rel-alternative', dash: '10 4', width: 2, Icon: IconArrowsExchange },
  { type: 'pairs_with', name: 'Pairs with', token: 'rel-pairs', width: 1, double: true, Icon: IconHeartHandshake },
]

export const REL_BY_TYPE = Object.fromEntries(REL_STYLES.map((s) => [s.type, s])) as Record<RelationshipType, RelStyle>

/** A short straight sample of a line style, for legends and toggles. */
export function LineSample({ style, width = 44 }: { style: RelStyle; width?: number }) {
  const stroke = `var(--${style.token})`
  return (
    <svg width={width} height="12" aria-hidden className="shrink-0">
      {style.double ? (
        <>
          <line x1="0" x2={width} y1="3" y2="3" stroke={stroke} strokeWidth="1.25" />
          <line x1="0" x2={width} y1="9" y2="9" stroke={stroke} strokeWidth="1.25" />
        </>
      ) : (
        <line x1="0" x2={width} y1="6" y2="6" stroke={stroke} strokeWidth={style.width} strokeDasharray={style.dash} />
      )}
    </svg>
  )
}

/** Legend for the lines on screen: dash sample, icon and name. */
export function RelationshipLegend({ types }: { types: RelationshipType[] }) {
  return (
    <div role="group" aria-label="Line legend" className="rounded-md border border-border bg-surface-1 px-3 py-2">
      <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
        {REL_STYLES.filter((s) => types.includes(s.type)).map((s) => (
          <li key={s.type} className="m-0 flex items-center gap-2.5">
            <LineSample style={s} width={40} />
            <s.Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
            <span>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
