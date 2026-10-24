import { IconMinus, IconPlus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export type Frame = { columns: string[]; rows: (string | number)[][] }

export type DataFrameDiffProps = {
  before: Frame
  after: Frame
  /** [row, col] positions in `after` whose value changed. */
  changed: [number, number][]
  /** Column names present only in `after`. */
  added: string[]
  /** Column names present only in `before`. */
  removed: string[]
  /** Full shape of each frame when the shown rows are a sample. */
  beforeShape?: [number, number]
  afterShape?: [number, number]
}

const fmt = new Intl.NumberFormat('en-US')
const shape = (r: number, c: number) => `${fmt.format(r)} × ${fmt.format(c)}`

/** Spec 10.8. Shows the "after" frame, with removed columns carried over from "before". */
export function DataFrameDiff({ before, after, changed, added, removed, beforeShape, afterShape }: DataFrameDiffProps) {
  const [bR, bC] = beforeShape ?? [before.rows.length, before.columns.length]
  const [aR, aC] = afterShape ?? [after.rows.length, after.columns.length]
  const shapeLine = `${shape(bR, bC)} → ${shape(aR, aC)}`

  const columns = [...after.columns, ...removed.filter((c) => !after.columns.includes(c))]
  const rowCount = Math.max(before.rows.length, after.rows.length)
  const changedSet = new Set(changed.map(([r, c]) => `${r}:${c}`))

  const parts: string[] = []
  if (changed.length) parts.push(`${changed.length} changed ${changed.length === 1 ? 'cell' : 'cells'}`)
  if (added.length) parts.push(`${added.length} added ${added.length === 1 ? 'column' : 'columns'}`)
  if (removed.length) parts.push(`${removed.length} removed ${removed.length === 1 ? 'column' : 'columns'}`)
  const caption = `Data frame, ${shapeLine}. ${parts.length ? parts.join(', ') : 'No changes'}.`

  return (
    <div data-slot="dataframe-diff" className="grid gap-2">
      <p className="m-0 text-sm font-bold tabular-nums" data-slot="shape-line">
        {shapeLine}
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse font-mono text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const isAdded = added.includes(c)
                const isRemoved = removed.includes(c)
                return (
                  <th
                    key={c}
                    scope="col"
                    data-state={isAdded ? 'added' : isRemoved ? 'removed' : undefined}
                    className={cn(
                      'border-b border-border-strong bg-surface-2 px-3 py-2 text-left font-bold whitespace-nowrap',
                      isAdded && 'bg-valid-bg text-valid-text',
                      isRemoved && 'font-normal text-text-muted line-through',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isAdded && <IconPlus className="size-3.5" aria-label="Added column" role="img" />}
                      {isRemoved && <IconMinus className="size-3.5" aria-label="Removed column" role="img" />}
                      {c}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, r) => (
              <tr key={r} className="border-b border-border last:border-b-0">
                {columns.map((c, ci) => {
                  const isRemoved = removed.includes(c) && !after.columns.includes(c)
                  const src = isRemoved ? before : after
                  const value = src.rows[r]?.[src.columns.indexOf(c)]
                  const isChanged = !isRemoved && changedSet.has(`${r}:${ci}`)
                  return (
                    <td
                      key={c}
                      data-state={isChanged ? 'changed' : undefined}
                      className={cn(
                        'border-l-2 border-transparent px-3 py-1.5 whitespace-nowrap',
                        isRemoved && 'text-text-muted line-through',
                        added.includes(c) && 'bg-valid-bg/40',
                        isChanged && 'border-accent bg-accent/15 font-bold',
                      )}
                    >
                      {value === undefined ? '' : String(value)}
                      {isChanged && <span className="sr-only"> (changed)</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
