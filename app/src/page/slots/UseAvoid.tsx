import { IconCheck, IconX } from '@tabler/icons-react'
import type { UseAvoid as UseAvoidData } from '@/content/types'
import { Slot, TagList } from './shared'

export function UseAvoid({ data }: { data: UseAvoidData }) {
  return (
    <Slot name="use_avoid" title="Use when / Avoid when">
      <TagList label="Use when" tags={data.use_when} icon={<IconCheck className="size-4" aria-hidden />} />
      <TagList label="Avoid when" tags={data.avoid_when} icon={<IconX className="size-4" aria-hidden />} />
    </Slot>
  )
}
