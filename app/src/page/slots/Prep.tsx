import { IconBan, IconCheck, IconStar } from '@tabler/icons-react'
import type { ComponentType } from 'react'
import type { Condition, PrepEntry, PrepStatus } from '@/content/types'
import { cn } from '@/lib/utils'
import { useCatalogue } from './context'
import { None, PageLink, Slot, Tag } from './shared'

/** Neutral by design: these are prep levels, not severities. Icon, label and border style differ. */
const STATUS: Record<PrepStatus, { label: string; Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; cls: string }> = {
  required: { label: 'Required', Icon: IconCheck, cls: 'border-text bg-surface-2 text-text' },
  recommended: { label: 'Recommended', Icon: IconStar, cls: 'border-border-strong text-text' },
  not_needed: { label: 'Not needed', Icon: IconBan, cls: 'border-dashed border-border-strong text-text-muted' },
}

function PrepChip({ status }: { status: PrepStatus }) {
  const { label, Icon, cls } = STATUS[status]
  return (
    <span
      data-status={status}
      className={cn('inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', cls)}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}

const FLAGS: Record<string, [string, string]> = {
  has_categoricals: ['has categoricals', 'no categoricals'],
  has_missing: ['has missing values', 'no missing values'],
  time_ordered: ['time ordered', 'not time ordered'],
  imbalanced: ['imbalanced', 'balanced'],
}

export function conditionTags(c: Condition | null): string[] {
  if (!c) return []
  const tags: string[] = []
  if (c.task_type?.length) tags.push(`task: ${c.task_type.join(' or ')}`)
  if (c.track?.length) tags.push(`track: ${c.track.join(' or ')}`)
  for (const [key, [yes, no]] of Object.entries(FLAGS)) {
    const v = c[key as keyof Condition]
    if (typeof v === 'boolean') tags.push(`if: ${v ? yes : no}`)
  }
  return tags
}

export function showValue(v: unknown): string {
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (v === null) return 'None'
  return typeof v === 'string' ? `'${v}'` : String(v)
}

function Row({ entry }: { entry: PrepEntry }) {
  const { pageName, familyPage } = useCatalogue()
  const step = entry.step
  const target = 'page' in step ? step.page : familyPage(step.family, step.stage)
  const name = 'page' in step ? pageName(step.page) : step.family
  const tags = conditionTags(entry.condition)
  return (
    <li data-prep-status={entry.status} className="grid gap-2 border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="font-bold">{target ? <PageLink id={target}>{name}</PageLink> : name}</span>
        <PrepChip status={entry.status} />
      </div>
      <p className="m-0 text-text-muted">{entry.why}</p>
      {tags.length || entry.unless ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {tags.map((t) => (
            <li key={t}>
              <Tag>{t}</Tag>
            </li>
          ))}
          {entry.unless ? (
            <li>
              <Tag>
                unless&nbsp;<code className="border-0 bg-transparent p-0">{entry.unless.setting}={showValue(entry.unless.value)}</code>
              </Tag>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  )
}

export function Prep({ entries }: { entries: PrepEntry[] }) {
  return (
    <Slot name="prep" title="Before you use it">
      {entries.length === 0 ? (
        <None />
      ) : (
        <ul className="m-0 list-none p-0">
          {entries.map((e, i) => (
            <Row key={i} entry={e} />
          ))}
        </ul>
      )}
    </Slot>
  )
}
