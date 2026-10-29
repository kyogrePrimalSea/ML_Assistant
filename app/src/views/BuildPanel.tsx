import { useEffect, useRef, useState } from 'react'
import {
  IconCheck, IconChevronDown, IconChevronRight, IconInfoCircle, IconNotebook, IconQuestionMark, IconTrash, IconX,
} from '@tabler/icons-react'
import { PagePanel } from '@/page/PagePanel'
import { STAGES } from '@/components/StageBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Mark, MarkResult } from '@/build/compat'
import { STAGE_ORDER, type DataProfile, type Issue } from '@/build/validate'
import type { ItemRecord, StageId, TaskType } from '@/content/types'
import { MARK_LABEL, NO_SUMMARY, writeUp, type FlagField } from './buildModel'

const MARK_STYLE: Record<Mark, { chip: string; Icon: typeof IconCheck }> = {
  green: { chip: 'bg-valid-bg text-valid-text border-valid-text/40', Icon: IconCheck },
  yellow: { chip: 'bg-warn-bg text-warn-text border-warn-text/40', Icon: IconQuestionMark },
  red: { chip: 'bg-block-bg text-block-text border-block-text/40', Icon: IconX },
}

/** Compatibility mark: tick, ? or cross, always with its label (spec 8.1, 11). */
export function MarkChip({ mark }: { mark: Mark }) {
  const { chip, Icon } = MARK_STYLE[mark]
  return (
    <span
      data-slot="mark-chip"
      data-mark={mark}
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${chip}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {MARK_LABEL[mark]}
    </span>
  )
}

const SEVERITY_WORD: Record<Issue['severity'], string> = { block: 'Blocked', warn: 'Warning', tip: 'Tip' }

/** Pros and cons in a tooltip that opens on hover and on keyboard focus. Text comes from the page record only. */
export function ProsCons({
  name, pros, cons, reasons = [],
}: { name: string; pros: string[]; cons: string[]; reasons?: Issue[] }) {
  const empty = pros.length === 0 && cons.length === 0 && reasons.length === 0
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="bld-info" aria-label={`Pros and cons of ${name}`}>
          <IconInfoCircle className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bld-tip" side="top" collisionPadding={12}>
        {empty ? (
          <p className="m-0">{NO_SUMMARY}</p>
        ) : (
          <>
            {reasons.length > 0 ? (
              <>
                <h4>Why this mark</h4>
                <ul>{reasons.map((i) => <li key={i.key}>{SEVERITY_WORD[i.severity]}: {i.message}</li>)}</ul>
              </>
            ) : null}
            <h4>Pros</h4>
            {pros.length ? <ul>{pros.map((p) => <li key={p}>{p}</li>)}</ul> : <p className="m-0 mb-2">{NO_SUMMARY}</p>}
            <h4>Cons</h4>
            {cons.length ? <ul className="mb-0">{cons.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="m-0">{NO_SUMMARY}</p>}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

const FLAGS: [FlagField, string, string][] = [
  ['has_categoricals', 'Has text categories', 'No text categories'],
  ['has_missing', 'Has missing values', 'No missing values'],
  ['time_ordered', 'Time-ordered', 'Not time-ordered'],
  ['imbalanced', 'Imbalanced', 'Balanced classes'],
]

/** Editable Passport: toggle chips (icon plus label) and a task type choice. Editing re-validates the journey. */
function Passport({
  profile, onFlag, onTask,
}: { profile: DataProfile; onFlag: (f: FlagField, v: boolean) => void; onTask: (t: TaskType) => void }) {
  return (
    <section aria-labelledby="bld-passport-h" className="grid gap-2 rounded-lg border border-border bg-surface-1 p-3" data-testid="build-passport">
      <h3 id="bld-passport-h" className="text-base">Passport</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="font-bold">Task</span>
          <select
            value={profile.task_type}
            onChange={(e) => onTask(e.target.value as TaskType)}
            className="h-9 rounded-md border border-border-strong bg-surface-1 px-2 text-sm font-bold text-text"
          >
            <option value="regression">Regression</option>
            <option value="classification">Classification</option>
          </select>
        </label>
        <span className="text-text-muted">{profile.track} track</span>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {FLAGS.map(([field, yes, no]) => {
          const on = profile[field]
          return (
            <li key={field}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onFlag(field, !on)}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border-strong bg-surface-1 px-2.5 py-0.5 text-xs font-bold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-accent aria-pressed:bg-surface-2"
              >
                {on ? <IconCheck className="size-3.5" aria-hidden /> : <IconX className="size-3.5 text-text-muted" aria-hidden />}
                <span className={on ? '' : 'text-text-muted'}>{on ? yes : no}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface CapsuleProps {
  stage: StageId
  picks: ItemRecord[]
  marks: Record<string, MarkResult>
  open: boolean
  onToggle: () => void
  onRemove: (id: string) => void
  onOpenPage: (id: string, trigger: HTMLElement) => void
}

const RANK: Record<Mark, number> = { green: 0, yellow: 1, red: 2 }

function Capsule({ stage, picks, marks, open, onToggle, onRemove, onOpenPage }: CapsuleProps) {
  const { label, Icon } = STAGES[stage]
  const worst = picks.reduce<Mark>((w, r) => (RANK[marks[r.id]?.mark ?? 'green'] > RANK[w] ? marks[r.id].mark : w), 'green')
  return (
    <li data-stage={stage} data-testid={`capsule-${stage}`} className="bld-capsule">
      <button type="button" className="bld-capsule-head" aria-expanded={open} onClick={onToggle}>
        {open ? <IconChevronDown className="size-4" aria-hidden /> : <IconChevronRight className="size-4" aria-hidden />}
        <span style={{ color: `var(--stage-${stage})` }} className="inline-flex"><Icon className="size-4" aria-hidden /></span>
        <span>{label}</span>
        <span className="min-w-0 flex-1 truncate font-normal text-text-muted">{picks.map((p) => p.plain_name).join(', ')}</span>
        <MarkChip mark={worst} />
      </button>
      {open ? (
        <div className="bld-capsule-body">
          {picks.map((r) => {
            const text = writeUp(r)
            const m = marks[r.id]
            return (
              <div key={r.id} className="grid gap-2" data-testid="capsule-pick">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="m-0 text-base">{r.plain_name}</h4>
                  <MarkChip mark={m?.mark ?? 'green'} />
                </div>
                {text.length ? text.map((t) => <p key={t} className="bld-writeup">{t}</p>) : <p className="bld-writeup text-text-muted">{NO_SUMMARY}</p>}
                {m && m.reasons.length > 0 ? (
                  <ul className="m-0 grid gap-1 pl-5 text-sm">
                    {m.reasons.map((i) => <li key={i.key}>{SEVERITY_WORD[i.severity]}: {i.message}</li>)}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={(e) => onOpenPage(r.id, e.currentTarget)}>
                    Open the {r.plain_name} page
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(r.id)} aria-label={`Remove ${r.plain_name}`}>
                    <IconTrash aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </li>
  )
}

export interface JourneyPanelProps {
  profile: DataProfile
  onFlag: (f: FlagField, v: boolean) => void
  onTask: (t: TaskType) => void
  picks: ItemRecord[]
  marks: Record<string, MarkResult>
  /** Stage whose capsule is forced open (a stop was selected on the globe). */
  focusStage: StageId | null
  onRemove: (id: string) => void
  onOpenPage: (id: string, trigger: HTMLElement) => void
  onNotebook: () => void
  onReset: () => void
}

/** The journey side panel: Passport, one capsule per stage that holds a pick, and Get notebook. */
export function JourneyPanel(p: JourneyPanelProps) {
  const [open, setOpen] = useState<Set<StageId>>(new Set())
  const [seenFocus, setSeenFocus] = useState<StageId | null>(null)
  // A stop selected on the globe opens its capsule (state adjusted during render, not in an effect).
  if (p.focusStage !== seenFocus) {
    setSeenFocus(p.focusStage)
    if (p.focusStage) setOpen((o) => new Set(o).add(p.focusStage!))
  }
  const stages = STAGE_ORDER.filter((s) => p.picks.some((r) => r.stage === s))
  const isOpen = (s: StageId) => open.has(s)
  const toggle = (s: StageId) =>
    setOpen((o) => { const n = new Set(o); if (n.has(s)) n.delete(s); else n.add(s); return n })
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="build-journey-panel">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <h2 className="m-0 flex-1 text-lg">Your journey</h2>
          <Button size="sm" variant="ghost" onClick={p.onReset}>Start over</Button>
        </div>
        <Passport profile={p.profile} onFlag={p.onFlag} onTask={p.onTask} />
        {stages.length === 0 ? (
          <p className="m-0 rounded-lg border border-dashed border-border-strong p-4 text-sm text-text-muted">
            Nothing picked yet. Each stage you add to shows up here as a capsule.
          </p>
        ) : (
          <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-2 p-0" aria-label="Journey capsules">
            {stages.map((s) => (
              <Capsule
                key={s}
                stage={s}
                picks={p.picks.filter((r) => r.stage === s)}
                marks={p.marks}
                open={isOpen(s)}
                onToggle={() => toggle(s)}
                onRemove={p.onRemove}
                onOpenPage={p.onOpenPage}
              />
            ))}
          </ol>
        )}
      </div>
      <div className="border-t border-border p-4">
        <Button className="w-full" onClick={p.onNotebook}><IconNotebook aria-hidden /> Get notebook</Button>
      </div>
    </div>
  )
}

/** The second side panel: one page, next to the journey panel. Close (or Escape) returns to the journey. */
export function PageSidePanel({ id, onClose, onNavigate }: { id: string; onClose: () => void; onNavigate: (id: string) => void }) {
    const closeBtn = useRef<HTMLButtonElement>(null)
    useEffect(() => { closeBtn.current?.focus() }, [])
    return (
      <aside
        aria-label="Page panel"
        data-testid="build-page-panel"
        className="bld-panel bld-panel-enter flex w-[380px] min-w-0 shrink-0 flex-col @[1200px]/build:w-[440px]"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        onClick={(e) => {
          // Links inside the page open other pages in this same panel, so the journey stays where it is.
          const a = (e.target as HTMLElement).closest('a')
          const m = a?.getAttribute('href')?.match(/\/page\/([^/?#]+)/)
          if (m) {
            e.preventDefault()
            onNavigate(decodeURIComponent(m[1]))
          }
        }}
      >
        <div className="flex justify-end border-b border-border px-4 py-2">
          <Button ref={closeBtn} variant="ghost" size="sm" onClick={onClose}><IconX aria-hidden /> Close</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <PagePanel id={id} />
        </div>
      </aside>
    )
}
