import { useEffect, useState } from 'react'
import { IconArrowRight, IconChartHistogram, IconSwitchHorizontal } from '@tabler/icons-react'
import { Switch } from 'radix-ui'
import { CodeBlock } from '@/components/CodeBlock'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { WhatComesOut as WhatComesOutData, WhatComesOutBody } from '@/content/types'
import { cn } from '@/lib/utils'
import { Frame, None, Slot, Tag } from './shared'

/** Toy outputs file (T028): rows from one small real run, copied to public/data/cutscenes/outputs/. */
export interface ProbaRow { row: number; y_true: number; proba: number[] }
export interface RegRow { row: number; y_true: number; y_pred_log: number; y_pred: number }
export interface ToyOutputs {
  page: string
  classification?: { class_names: string[]; rows: ProbaRow[] }
  regression?: { target_transform: string; rows: RegRow[] }
}

type OutputsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ToyOutputs }

const cache = new Map<string, Promise<ToyOutputs>>()
export function clearOutputsCache() {
  cache.clear()
}

function loadOutputs(pageId: string): Promise<ToyOutputs> {
  let p = cache.get(pageId)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/cutscenes/outputs/${encodeURIComponent(pageId)}.json`).then((r) => {
      if (!r.ok) throw new Error(`outputs ${pageId}: ${r.status}`)
      return r.json() as Promise<ToyOutputs>
    })
    p.catch(() => cache.delete(pageId))
    cache.set(pageId, p)
  }
  return p
}

function useOutputs(pageId: string): OutputsState {
  const [state, setState] = useState<{ id: string; s: OutputsState } | null>(null)
  useEffect(() => {
    let live = true
    loadOutputs(pageId).then(
      (data) => live && setState({ id: pageId, s: { status: 'ready', data } }),
      () => live && setState({ id: pageId, s: { status: 'error' } }),
    )
    return () => {
      live = false
    }
  }, [pageId])
  return state && state.id === pageId ? state.s : { status: 'loading' }
}

const num = 'tabular-nums'
const th = 'py-2 pr-2 text-left text-xs font-normal text-text-muted'
const td = 'py-2 pr-2 text-sm tabular-nums'
/** Same changed-cell look as the data-frame diff: accent tint plus a bar. */
const hot = 'border-l-2 border-accent bg-accent/15 pl-2 font-bold'

export const fmtDollars = (n: number) => Math.round(n).toLocaleString('en-US')
const round2 = (n: number) => Math.round(n * 100) / 100

/** Class 1 when proba[1] reaches the threshold. */
export const labelAt = (proba: number[], threshold: number) => (proba[1] >= threshold ? 1 : 0)

export function ProbaTable({ data }: { data: NonNullable<ToyOutputs['classification']> }) {
  const [threshold, setThreshold] = useState(0.5)
  const [c0, c1] = data.class_names
  const flipped = data.rows.filter((r) => labelAt(r.proba, threshold) !== labelAt(r.proba, 0.5)).length
  return (
    <div data-visual="proba_table" className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-3">
          <span id="threshold-label" className="text-sm font-bold">
            Decision threshold
          </span>
          <output className={cn('text-sm font-bold', num)} data-threshold-value>
            {threshold.toFixed(2)}
          </output>
        </div>
        <Slider
          aria-labelledby="threshold-label"
          min={0.05}
          max={0.95}
          step={0.05}
          value={[threshold]}
          onValueChange={([v]) => setThreshold(round2(v))}
        />
        <p className="m-0 text-sm text-text-muted">
          <code>predict()</code> uses 0.50. Move the slider to see how the labels change.
        </p>
      </div>
      <p role="status" aria-live="polite" className={cn('m-0 text-sm font-bold', num)} data-flipped-count>
        {flipped} {flipped === 1 ? 'label' : 'labels'} changed
      </p>
      <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Predicted probabilities and labels">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className={th}>row</th>
              <th scope="col" className={th}>P({c0})</th>
              <th scope="col" className={cn(th, 'border-l-2 border-accent pl-2')}>
                P({c1})<br /><span className="text-xs"><code>y_score</code></span>
              </th>
              <th scope="col" className={th}>predicted</th>
              <th scope="col" className={th}>actual</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const label = labelAt(r.proba, threshold)
              const changed = label !== labelAt(r.proba, 0.5)
              return (
                <tr key={r.row} className="border-t border-border" data-row={r.row} data-changed={changed ? 'true' : undefined}>
                  <th scope="row" className={cn(td, 'text-left font-bold')}>{r.row}</th>
                  <td className={td}>{r.proba[0].toFixed(3)}</td>
                  <td className={cn(td, hot)}>{r.proba[1].toFixed(3)}</td>
                  <td className={cn(td, changed && 'font-bold')} data-predicted>
                    {data.class_names[label]}
                    {changed ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs">
                        <IconSwitchHorizontal className="size-3.5" aria-hidden />
                        changed
                      </span>
                    ) : null}
                  </td>
                  <td className={td}>{data.class_names[r.y_true]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RegressionPreds({ data }: { data: NonNullable<ToyOutputs['regression']> }) {
  const [undo, setUndo] = useState(false)
  return (
    <div data-visual="regression_preds" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Switch.Root
          id="undo-log-target"
          checked={undo}
          onCheckedChange={setUndo}
          className="relative h-6 w-11 shrink-0 rounded-full border-2 border-accent bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:bg-accent"
        >
          <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-accent transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-on-accent motion-reduce:transition-none" />
        </Switch.Root>
        <label htmlFor="undo-log-target" className="text-sm font-bold">
          Undo log target
        </label>
      </div>
      <p className="m-0 min-h-5 text-sm text-text-muted" data-log-note>
        {undo ? 'Back in dollars.' : <>Still in log units: undo with <code>np.expm1</code> before reporting errors.</>}
      </p>
      <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Actual and predicted prices">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className={th}>row</th>
              <th scope="col" className={th}>actual ($)</th>
              <th scope="col" className={cn(th, 'border-l-2 border-accent pl-2')}>
                predicted {undo ? '($)' : '(log units)'}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.row} className="border-t border-border" data-row={r.row}>
                <th scope="row" className={cn(td, 'text-left font-bold')}>{r.row}</th>
                <td className={td}>{fmtDollars(r.y_true)}</td>
                <td className={cn(td, hot)} data-predicted>
                  {undo ? fmtDollars(r.y_pred) : r.y_pred_log.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type Task = 'classification' | 'regression'

function Visual({
  visual,
  pageId,
  defaultTask,
}: {
  visual: NonNullable<WhatComesOutBody['visual']>
  pageId: string
  defaultTask: Task
}) {
  const out = useOutputs(pageId)
  const [picked, setTask] = useState<Task | null>(null)
  const task = picked ?? defaultTask

  const missing = (detail: string) => (
    <Frame icon={<IconChartHistogram className="size-4" aria-hidden />} label="Example output" detail={detail} />
  )
  if (out.status === 'loading') return missing('Loading the example output.')
  if (out.status === 'error') return missing('The example output could not be loaded.')
  const { classification, regression } = out.data

  const shown: Task = visual === 'both' ? task : visual === 'regression_preds' ? 'regression' : 'classification'
  const body =
    shown === 'classification' ? (
      classification ? <ProbaTable data={classification} /> : missing('No classification example for this page.')
    ) : regression ? (
      <RegressionPreds data={regression} />
    ) : (
      missing('No regression example for this page.')
    )
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-1 p-4" data-visual-box>
      {visual === 'both' ? (
        <ToggleGroup
          type="single"
          variant="outline"
          value={task}
          onValueChange={(v) => v && setTask(v as Task)}
          aria-label="Task"
        >
          <ToggleGroupItem value="classification">Classification</ToggleGroupItem>
          <ToggleGroupItem value="regression">Regression</ToggleGroupItem>
        </ToggleGroup>
      ) : null}
      {body}
    </div>
  )
}

/** Slot 7. `defaultTask` is the starting side of the Classification | Regression toggle (E11's goal selector sets it later). */
export function WhatComesOut({
  data,
  pageId,
  defaultTask = 'classification',
}: {
  data: WhatComesOutData
  pageId: string
  defaultTask?: Task
}) {
  let body
  if ('none' in data) {
    body = <None />
  } else {
    body = (
      <>
        <ul className="m-0 grid list-none gap-0 p-0">
          {data.items.map((it) => (
            <li key={it.name} className="grid gap-1 border-t border-border py-2 first:border-t-0" data-output-item>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <code className="border-0 bg-transparent p-0 font-bold [overflow-wrap:anywhere]">{it.name}</code>
                <span className="text-sm text-text-muted">{it.kind}</span>
                {it.task ? <Tag className="text-xs">{it.task}</Tag> : null}
                <span className={cn('text-sm font-bold', num)}>{it.shape}</span>
              </div>
              <p className="m-0 text-sm text-text-muted">{it.note}</p>
            </li>
          ))}
        </ul>
        {data.next_step ? (
          <p className="m-0 flex items-start gap-2">
            <IconArrowRight className="mt-1 size-4 shrink-0" aria-hidden />
            <span>{data.next_step}</span>
          </p>
        ) : null}
        {data.snippet ? <CodeBlock code={data.snippet} /> : null}
        {data.visual ? <Visual visual={data.visual} pageId={pageId} defaultTask={defaultTask} /> : null}
      </>
    )
  }
  return (
    <Slot name="what_comes_out" title="What comes out">
      {body}
    </Slot>
  )
}
