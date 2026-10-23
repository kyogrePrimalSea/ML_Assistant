import { useState, type ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { KeySetting, KeySettingFacts, KeySettings as KeySettingsData } from '@/content/types'
import { cn } from '@/lib/utils'
import { None, PageLink, Slot } from './shared'

/** "None → 6" when the signature default is None but the library resolves it. Null when the facts are missing. */
export function defaultText(facts: KeySettingFacts | undefined): { text: string; effective: boolean } | null {
  if (!facts) return null
  const list = 'by_target' in facts ? Object.values(facts.by_target) : [facts]
  const texts = new Set(
    list.map((f) => {
      const d = f.default ?? 'None'
      return f.effective_default != null && f.effective_default !== d ? `${d} → ${f.effective_default}` : d
    }),
  )
  if (texts.size !== 1) return { text: 'varies by library', effective: false }
  const text = [...texts][0]
  return { text, effective: text.includes('→') }
}

function Row({ s, facts }: { s: KeySetting; facts: KeySettingFacts | undefined }) {
  const d = defaultText(facts)
  return (
    <li className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 border-t border-border py-2 first:border-t-0">
      <code className="w-fit self-start border-0 bg-transparent p-0 font-bold [overflow-wrap:anywhere]">
        {s.page ? <PageLink id={s.page}>{s.name}</PageLink> : s.name}
      </code>
      <span className="grid gap-0.5">
        {d ? (
          <>
            <span className="font-code text-sm">{d.text}</span>
            {d.effective ? <span className="text-xs text-text-muted">effective default</span> : null}
          </>
        ) : (
          <span className="text-sm text-text-muted">Not listed</span>
        )}
      </span>
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
              <span>Tier 1</span>
              <span>Default</span>
            </div>
            <List items={data.tier1} facts={facts} />
          </div>
          <Reveal label="More settings" count={data.tier2.length}>
            <List items={data.tier2} facts={facts} />
          </Reveal>
          <Reveal label="Tier 3 settings" count={data.tier3.length}>
            <List items={data.tier3} facts={facts} />
          </Reveal>
        </>
      )}
    </Slot>
  )
}
