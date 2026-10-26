import { useState } from 'react'
import { IconChevronDown, IconPlayerPlay, IconThumbDown, IconThumbUp } from '@tabler/icons-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Intuition as IntuitionData } from '@/content/types'
import { cn } from '@/lib/utils'
import { useCatalogue } from './context'
import { Frame, None, PageLink, Slot, TagList } from './shared'

function Toggle({ open, children }: { open: boolean; children: string }) {
  return (
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-md border border-border-strong px-3 py-2 text-left font-bold hover:bg-surface-2">
      {children}
      <IconChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
    </CollapsibleTrigger>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <h4 className="m-0 text-sm text-text-muted">{label}</h4>
      {children}
    </div>
  )
}

function ModelBody({ data }: { data: Extract<IntuitionData, { idea: string }> }) {
  const { pageName } = useCatalogue()
  const [more, setMore] = useState(false)
  return (
    <div className="grid gap-5">
      {data.goal ? (
        <Labelled label="What we are trying to do">
          <p className="m-0">{data.goal}</p>
        </Labelled>
      ) : null}
      {data.steps ? (
        <Labelled label="How it works">
          <ol className="m-0 grid gap-2 pl-6">
            {data.steps.map((step) => <li key={step} className="pl-1">{step}</li>)}
          </ol>
        </Labelled>
      ) : null}
      {data.math ? (
        <Labelled label="The mathematics">
          <div className="grid gap-4">
            <dl className="m-0 grid gap-2">
              {data.math.notation.map((item) => (
                <div key={item.symbol} className="grid grid-cols-[minmax(3rem,auto)_1fr] gap-x-3">
                  <dt><code>{item.symbol}</code></dt>
                  <dd className="m-0">{item.meaning}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-3">
              {data.math.equations.map((equation) => (
                <div key={equation.expression} className="grid gap-1">
                  <pre className="m-0 overflow-x-auto whitespace-pre rounded-md border border-border bg-code-bg p-3"><code>{equation.expression}</code></pre>
                  <p className="m-0 text-sm text-text-muted">{equation.meaning}</p>
                </div>
              ))}
            </div>
            <p className="m-0">{data.math.prediction}</p>
          </div>
        </Labelled>
      ) : null}
      <Labelled label="The one idea">
        <p className="m-0 text-lg">{data.idea}</p>
      </Labelled>
      <Labelled label="Everyday analogy">
        <p className="m-0">{data.analogy}</p>
      </Labelled>
      <Frame icon={<IconPlayerPlay className="size-4" aria-hidden />} label="Animation" detail={data.animation} />
      <TagList label="Good at" tags={data.good_at} icon={<IconThumbUp className="size-4" aria-hidden />} />
      <TagList label="Bad at" tags={data.bad_at} icon={<IconThumbDown className="size-4" aria-hidden />} />
      <Labelled label="Versus siblings">
        {data.vs_siblings.length === 0 ? (
          <None />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {data.vs_siblings.map((s) => (
              <li key={s.page}>
                <PageLink id={s.page} className="font-bold">
                  {pageName(s.page)}
                </PageLink>
                <span className="text-text-muted"> · {s.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Labelled>
      <Collapsible open={more} onOpenChange={setMore} className="grid gap-3">
        <Toggle open={more}>Read more</Toggle>
        <CollapsibleContent>
          {data.read_more.length === 0 ? (
            <None />
          ) : (
            <ol className="m-0 grid gap-2 pl-6">
              {data.read_more.map((step) => (
                <li key={step} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/** Slot 10: collapsed by default. The toggle sits inside the heading so the heading is still there when closed. */
export function Intuition({ data }: { data: IntuitionData }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Slot
        name="intuition"
        title="Intuition"
        heading={
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-md py-1 text-left hover:bg-surface-2">
            Intuition
            <IconChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} aria-hidden />
          </CollapsibleTrigger>
        }
      >
        <CollapsibleContent>
          {'none' in data ? <None /> : 'text' in data ? <p className="m-0 text-lg">{data.text}</p> : <ModelBody data={data} />}
        </CollapsibleContent>
      </Slot>
    </Collapsible>
  )
}
