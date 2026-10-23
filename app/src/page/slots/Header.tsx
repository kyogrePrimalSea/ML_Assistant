import { IconPencil } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { StageBadge } from '@/components/StageBadge'
import type { ItemRecord } from '@/content/types'
import { ARCHETYPE_ICONS } from '@/views/archetypeIcons'
import { useCatalogue } from './context'

/** Slot 1. The slot holds no data: everything comes from the record's metadata. */
export function Header({ record }: { record: ItemRecord }) {
  const { archetypeName } = useCatalogue()
  const Icon = ARCHETYPE_ICONS[record.archetype]
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
        <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5">
          <Icon className="size-3.5" aria-hidden />
          {archetypeName(record.archetype)}
        </Badge>
        <StageBadge stage={record.stage} />
        {record.reviewed ? null : (
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 font-normal text-text-muted">
            <IconPencil className="size-3.5" aria-hidden />
            Draft
          </Badge>
        )}
      </div>
    </section>
  )
}
