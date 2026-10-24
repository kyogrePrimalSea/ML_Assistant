import { useId, useState } from 'react'
import { Link } from 'react-router'
import { IconChevronDown, IconTopologyStar, IconUsersGroup } from '@tabler/icons-react'
import type { Relationship } from '@/content/types'
import { connectionsOf } from '@/views/RelationshipLines'
import { useConnections } from '@/views/connections'
import { LineSample, REL_STYLES } from '@/views/relationshipStyles'
import { useCatalogue } from './context'

/**
 * Panel header control: show this item's connections as lines in the Tree, one type at a time.
 * The names are listed here too, which is the text equivalent of the lines.
 */
export function Connections({ id, appliesTo = [] }: { id: string; appliesTo?: string[] }) {
  const { index, pageName } = useCatalogue()
  const { on, toggle, canDraw } = useConnections()
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const rels: Relationship[] = index?.relationships ?? []
  const all = connectionsOf(rels, id)
  if (all.length === 0 && appliesTo.length === 0) return null
  const shown = REL_STYLES.filter((s) => on.has(s.type)).length

  return (
    <div data-connections className="grid gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 w-fit items-center gap-2 rounded-md border border-border bg-surface-1 px-3 text-sm font-medium text-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <IconTopologyStar className="size-4 text-accent-strong" aria-hidden />
        Show connections
        {shown > 0 ? <span className="text-text-muted">({shown} on)</span> : null}
        <IconChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <div id={bodyId} hidden={!open} className="grid gap-3">
        {canDraw ? null : <p className="m-0 text-sm text-text-muted">Lines are drawn in the Tree view.</p>}
        {REL_STYLES.map((s) => {
          const names = connectionsOf(rels, id).filter((c) => c.type === s.type)
          if (names.length === 0) return null
          const pressed = on.has(s.type)
          return (
            <div key={s.type} data-rel-group={s.type} className="grid gap-1.5">
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => toggle(s.type)}
                className={`flex min-h-10 w-fit items-center gap-2.5 rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  pressed ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface-1 text-text hover:bg-surface-2'
                }`}
              >
                <s.Icon className="size-4" aria-hidden />
                {s.name}
                <span className={pressed ? '' : 'text-text-muted'}>{names.length}</span>
                <span className="rounded-sm bg-canvas px-1.5 py-0.5" aria-hidden>
                  <LineSample style={s} width={34} />
                </span>
              </button>
              <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-sm" aria-label={`${s.name} connections`}>
                {names.map((c) => (
                  <li key={c.other} className="m-0">
                    <Link to={`/page/${c.other}`}>{pageName(c.other)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {appliesTo.length > 0 ? (
          // Used by comes from the record's applies_to. It is not one of the five line types (spec 5.3), so it has no line and no toggle.
          <div data-rel-group="used_by" className="grid gap-1.5">
            <p className="m-0 flex min-h-10 w-fit items-center gap-2.5 rounded-md border border-border bg-surface-1 px-3 text-sm font-medium text-text">
              <IconUsersGroup className="size-4" aria-hidden />
              Used by
              <span className="text-text-muted">{appliesTo.length}</span>
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-sm" aria-label="Used by">
              {appliesTo.map((other) => (
                <li key={other} className="m-0">
                  <Link to={`/page/${other}`}>{pageName(other)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
