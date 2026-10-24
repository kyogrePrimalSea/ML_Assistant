import { IconPencil } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { STAGES, StageBadge } from '@/components/StageBadge'
import { cn } from '@/lib/utils'
import type { ItemRecord } from '@/content/types'
import { ARCHETYPE_ICONS } from '@/views/archetypeIcons'
import { Connections } from './Connections'
import { useCatalogue } from './context'

/** Slot 1. The slot holds no data: everything comes from the record's metadata. */
export function Header({ record }: { record: ItemRecord }) {
  const { archetypeName } = useCatalogue()
  const Icon = ARCHETYPE_ICONS[record.archetype]
  const archetypeLabel = archetypeName(record.archetype)
  const stage = STAGES[record.stage]
  // A stage badge that repeats the archetype badge is hidden; a stage-colour dot on the archetype badge keeps the stage (spec 5.1, A9).
  const sameLabel = archetypeLabel.trim().toLowerCase() === stage.label.toLowerCase()
  return (
    <section data-slot-name="header" aria-labelledby="slot-header" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-1.5 size-7 shrink-0 text-accent-strong" aria-hidden />
        <div className="grid min-w-0 gap-1">
          <h2 id="slot-header" className="m-0 break-words">
            {record.plain_name}
          </h2>
          <p className="m-0 font-code break-words text-text-muted">{record.code_name}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          data-slot="archetype-badge"
          data-stage={sameLabel ? record.stage : undefined}
          className="gap-1.5 px-2.5 py-0.5"
        >
          {sameLabel ? <span data-stage-dot className={cn('size-2 shrink-0 rounded-full', stage.dot)} aria-hidden /> : null}
          <Icon className="size-3.5" aria-hidden />
          {archetypeLabel}
          {sameLabel ? <span className="sr-only">, stage {stage.label}</span> : null}
        </Badge>
        {sameLabel ? null : <StageBadge stage={record.stage} />}
        {record.reviewed ? null : (
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 font-normal text-text-muted">
            <IconPencil className="size-3.5" aria-hidden />
            Draft
          </Badge>
        )}
      </div>
      <Connections id={record.id} appliesTo={record.applies_to} />
    </section>
  )
}
