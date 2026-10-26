import { useState, type ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { KeySetting, KeySettingFacts, KeySettings as KeySettingsData } from '@/content/types'
import { cn } from '@/lib/utils'
import { None, PageLink, Slot } from './shared'

/**
 * What a default row shows: the effective value large, plus a note when the signature says something else
 * (`None` in the signature, 6 in practice). Null when the facts are missing.
 */
export function defaultText(facts: KeySettingFacts | undefined): { text: string; note: string | null } | null {
  if (!facts) return null
  const list = 'by_target' in facts ? Object.values(facts.by_target) : [facts]
  const shown = list.map((f) => {
    const signature = f.default ?? 'None'
    const effective = f.effective_default != null && f.effective_default !== signature ? f.effective_default : null
    return { text: effective ?? signature, note: effective ? `set as ${signature} in the signature` : null }
  })
  const keys = new Set(shown.map((d) => `${d.text}|${d.note}`))
  if (keys.size !== 1) return { text: 'varies by library', note: null }
  return shown[0]
}

function Row({ s, facts }: { s: KeySetting; facts: KeySettingFacts | undefined }) {
  const d = defaultText(facts)
  const summary = (
    <>
      <code className="w-fit self-start border-0 bg-transparent p-0 font-bold [overflow-wrap:anywhere]">
        {s.page ? <PageLink id={s.page}>{s.name}</PageLink> : s.name}
      </code>
      <span className="grid gap-0.5">
        {d ? (
          <>
            <span className="text-lg leading-tight font-bold tabular-nums">{d.text}</span>
            {d.note ? <span className="text-xs text-text-muted">{d.note}</span> : null}
          </>
        ) : (
          <span className="text-sm text-text-muted">Not listed</span>
        )}
      </span>
    </>
  )

  if (!s.controls && !s.effect) {
    return (
      <li className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 border-t border-border py-2 first:border-t-0">
        {summary}
      </li>
    )
  }

  return (
    <li className="grid gap-3 border-t border-border py-3 first:border-t-0">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4">{summary}</div>
      <dl className="m-0 grid gap-2 text-sm">
        {s.controls ? (
          <div className="grid gap-0.5">
            <dt className="font-bold text-text-muted">Controls</dt>
            <dd className="m-0">{s.controls}</dd>
          </div>
        ) : null}
        {s.effect ? (
          <div className="grid gap-0.5">
            <dt className="font-bold text-text-muted">Trade-off</dt>
            <dd className="m-0">{s.effect}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  )
}

function List({ items, facts }: { items: KeySetting[]; facts: Record<string, KeySettingFacts> }) {
  if (items.length === 0) return <None />
  return (
    <ul className="m-0 list-none p-0">
      {items.map((s) => (
        <Row key={s.name} s={s} facts={facts[s.name]} />
      ))}
    </ul>
  )
}

function Reveal({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid gap-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-md border border-border-strong px-3 py-2 text-left font-bold hover:bg-surface-2">
        <span>
          {label} <span className="font-normal text-text-muted">({count})</span>
        </span>
        <IconChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}

export function KeySettings({ data, facts }: { data: KeySettingsData; facts: Record<string, KeySettingFacts> }) {
  const all = data.tier1.length + data.tier2.length + data.tier3.length
  return (
    <Slot name="key_settings" title="Key settings">
      {all === 0 ? (
        <None />
      ) : (
        <>
          <div className="grid gap-1">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 text-sm text-text-muted">
              <span>Most used</span>
              <span>Default</span>
            </div>
            <List items={data.tier1} facts={facts} />
          </div>
          <Reveal label="Also useful" count={data.tier2.length}>
            <List items={data.tier2} facts={facts} />
          </Reveal>
          <Reveal label="Rarely changed" count={data.tier3.length}>
            <List items={data.tier3} facts={facts} />
          </Reveal>
        </>
      )}
    </Slot>
  )
}
