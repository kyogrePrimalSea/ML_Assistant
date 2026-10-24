import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { nodeName } from '@/content/labels'
import { useIndex } from '@/content/load'
import type { IndexPage, StageId } from '@/content/types'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { StageBadge } from '@/components/StageBadge'
import { cn } from '@/lib/utils'
import { useShellState } from '@/shell/ShellState'
import { ARCHETYPE_ICONS } from './archetypeIcons'

function ItemRow({ page, active }: { page: IndexPage; active: boolean }) {
  const Icon = ARCHETYPE_ICONS[page.archetype]
  const showCode = page.code_name !== page.plain_name
  const body = (
    <>
      <Icon className="mt-1 size-5 shrink-0" aria-hidden />
      <span className="grid min-w-0 gap-0.5">
        <span className="font-bold">{page.plain_name}</span>
        {showCode ? <span className="font-code text-xs text-text-muted">{page.code_name}</span> : null}
      </span>
    </>
  )
  const base = 'flex items-start gap-3 rounded-md px-3 py-2'
  if (!page.has_record) {
    return (
      <li className={cn(base, 'justify-between text-text-muted')} data-written="false">
        <span className="flex min-w-0 items-start gap-3">{body}</span>
        <span className="shrink-0 pt-0.5 text-xs">not written yet</span>
      </li>
    )
  }
  return (
    <li>
      <Link
        to={`/page/${page.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          base,
          'text-text no-underline hover:bg-surface-2 hover:text-text',
          active && 'bg-surface-2 outline-1 -outline-offset-1 outline-accent',
        )}
      >
        {body}
      </Link>
    </li>
  )
}

/** Interim Tree view: stages in pipeline order, families collapsed, one open at a time. */
export default function CatalogueList({ activeId }: { activeId?: string }) {
  const { data, error, loading } = useIndex()
  const { track } = useShellState()
  const [open, setOpen] = useState('')

  const groups = useMemo(() => {
    if (!data) return []
    return data.vocab.stages.map((stage) => {
      const pages = data.pages.filter((p) => p.stage === stage.id && p.tracks.includes(track))
      const families = new Map<string, IndexPage[]>()
      for (const p of pages) families.set(p.family, [...(families.get(p.family) ?? []), p])
      const sorted = [...families.entries()].sort(([a], [b]) => a.localeCompare(b))
      return { id: stage.id as StageId, families: sorted, count: pages.length }
    })
  }, [data, track])

  if (loading) return <p className="p-6 text-text-muted">Loading the catalogue…</p>
  if (error || !data) return <p className="p-6 text-block-text">Could not load the catalogue. Try reloading.</p>

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="shell-list grid gap-6">
      {groups.map((g) => (
        <section key={g.id} aria-label={`${g.id} stage`} data-stage={g.id} className="grid gap-2">
          <div className="flex items-center gap-3">
            <StageBadge stage={g.id} />
            <span className="text-xs text-text-muted">
              {g.count} {g.count === 1 ? 'page' : 'pages'}
            </span>
          </div>
          {g.families.length === 0 ? (
            <p className="px-1 text-sm text-text-muted">Nothing here for this track.</p>
          ) : (
            <div className="rounded-lg border border-border bg-surface-1">
              {g.families.map(([family, pages]) => (
                <AccordionItem key={family} value={`${g.id}/${family}`} className="px-2">
                  <AccordionTrigger className="px-3 py-3 text-base font-bold">
                    <span>
                      {nodeName(data, family)} <span className="ml-1 text-xs font-normal text-text-muted">{pages.length}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="grid gap-1">
                      {pages
                        .slice()
                        .sort((a, b) => a.plain_name.localeCompare(b.plain_name))
                        .map((p) => (
                          <ItemRow key={p.id} page={p} active={p.id === activeId} />
                        ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </div>
          )}
        </section>
      ))}
    </Accordion>
  )
}
