import type { ItemRecord } from '@/content/types'
import { useCatalogue } from './context'
import { None, PageLink, Slot } from './shared'

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(7rem,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-text-muted">{k}</dt>
          <dd className="m-0 font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Slot 3. The shape depends on the archetype; models also show task types from the rules block. */
export function QuickFacts({ record }: { record: ItemRecord }) {
  const { pageName } = useCatalogue()
  const q = record.slots.quick_facts
  let body
  if ('none' in q) {
    body = <None />
  } else if ('values' in q) {
    body = q.values.length === 0 ? (
      <None />
    ) : (
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-sm text-text-muted">
            <th scope="col" className="py-2 pr-3 font-normal">Used in</th>
            <th scope="col" className="py-2 pr-3 font-normal">Default</th>
            <th scope="col" className="py-2 font-normal">Typical range</th>
          </tr>
        </thead>
        <tbody>
          {q.values.map((v) => (
            <tr key={v.page} className="border-t border-border align-top">
              <th scope="row" className="py-2 pr-3 text-left font-bold">
                <PageLink id={v.page}>{pageName(v.page)}</PageLink>
              </th>
              <td className="py-2 pr-3 font-code text-sm">{v.default}</td>
              <td className="py-2 text-sm">{v.typical_range}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else if ('facts' in q) {
    body = q.facts.length === 0 ? <None /> : <Facts rows={q.facts.map((f) => [f.label, f.value])} />
  } else {
    const rows: [string, string][] = []
    const tasks = record.rules.task_types
    if (tasks.length) rows.push(['Task types', tasks.join(', ')])
    rows.push(['Data size', q.data_size])
    body = <Facts rows={rows} />
  }
  return (
    <Slot name="quick_facts" title="Quick facts">
      {body}
    </Slot>
  )
}
