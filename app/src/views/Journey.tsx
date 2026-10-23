import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  IconCheck, IconChevronDown, IconChevronRight, IconNotebook, IconPlayerPlay, IconPlayerSkipForward, IconPlayerStop,
  IconX,
} from '@tabler/icons-react'
import { Callout } from '@/components/Callout'
import { StageBadge, STAGES } from '@/components/StageBadge'
import { StatusChip, type Severity } from '@/components/StatusChip'
import { Button } from '@/components/ui/button'
import { loadPage, useIndex } from '@/content/load'
import type { ItemRecord, StageId } from '@/content/types'
import { DEMO_PICK_IDS, DEMO_PROFILE, DEMO_SHAPE_OVERRIDES, DEMO_START_SHAPE } from '@/build/demoPipeline'
import { buildJourney, REGION_CENTRES, PASSPORT_POSITION, type Journey as JourneyData, type Stop } from '@/build/journey'
import { buildCells } from '@/build/notebook'
import { formatShape, shapeChanged } from '@/build/shape'
import type { DataProfile } from '@/build/validate'
import { useMediaQuery } from '@/shell/useMediaQuery'
import { JourneyGlobe, type GlobeHandle } from './JourneyGlobe'
import { NotebookView } from './NotebookView'
import './journey.css'

/** Camera height when a stop is selected: closer than the overview, but the route stays in view. */
const SELECT_ALTITUDE = 2.1

const asSeverity = (s: Stop['status']): Severity => s

function Passport({ profile, shape }: { profile: DataProfile; shape: { rows: number; columns: number } }) {
  const flags: [string, string, boolean][] = [
    ['Has text categories', 'No text categories', profile.has_categoricals],
    ['Has missing values', 'No missing values', profile.has_missing],
    ['Time-ordered', 'Not time-ordered', profile.time_ordered],
    ['Imbalanced', 'Balanced classes', profile.imbalanced],
  ]
  return (
    <section aria-labelledby="passport-h" className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-1 p-4" data-testid="passport">
      <h3 id="passport-h" className="text-base">Passport</h3>
      <p className="m-0 text-sm">
        <span className="font-bold capitalize">{profile.task_type}</span>
        <span className="text-text-muted"> · {profile.track} track · {formatShape(shape)}</span>
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {flags.map(([yes, no, on]) => (
          <li key={yes} className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-0.5 text-xs font-bold">
            {on ? <IconCheck className="size-3.5" aria-hidden /> : <IconX className="size-3.5 text-text-muted" aria-hidden />}
            <span className={on ? '' : 'text-text-muted'}>{on ? yes : no}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Ticket({
  stop, total, fixed, onFix,
}: { stop: Stop; total: number; fixed: ReadonlySet<string>; onFix: (key: string) => void }) {
  const r = stop.record
  const target = r.slots.code[0]?.target ?? r.targets[0]
  return (
    <section aria-label={`Ticket for stop ${stop.n}`} data-testid="ticket" className="grid grid-cols-1 gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-text-muted">Stop {stop.n} of {total}</span>
        <StageBadge stage={r.stage} />
        <StatusChip severity={asSeverity(stop.status)} />
      </div>
      <div>
        <h3 className="m-0 text-lg">{r.plain_name}</h3>
        <p className="m-0 text-sm text-text-muted"><code>{r.code_name}</code></p>
      </div>
      <p className="m-0 text-sm"><span className="font-bold">What it does. </span>{r.slots.solves && 'line' in r.slots.solves ? r.slots.solves.line : ''}</p>

      <div className="grid grid-cols-1 gap-2" aria-label="Status">
        {stop.issues.length === 0 ? (
          <Callout severity="valid" title="Fits here">Nothing in the pipeline conflicts with this step.</Callout>
        ) : null}
        {stop.issues.map((i) =>
          fixed.has(i.key) ? (
            <Callout key={i.key} severity="valid" title="Fixed">Wrapped in a Pipeline, so it is fitted on training rows only.</Callout>
          ) : (
            <Callout key={i.key} severity={i.severity}>
              <p className="m-0">{i.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {i.fix ? (
                  <Button size="sm" variant="outline" onClick={() => onFix(i.key)}>{i.fix.label}</Button>
                ) : null}
                <Link to={`/page/${i.sourceId}`} className="text-sm font-bold underline underline-offset-4">Why did this fire?</Link>
              </div>
            </Callout>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-1">
        <p className="m-0 text-sm font-bold">Uses</p>
        <code className="block rounded-md border border-border bg-code-bg px-3 py-2 text-[13px] break-all">{target}</code>
      </div>

      <div className="grid grid-cols-1 gap-1">
        <p className="m-0 text-sm font-bold">Data shape after this step</p>
        <p className="m-0 font-mono text-sm" data-testid="ticket-shape">
          {shapeChanged(stop.before, stop.after)
            ? `${formatShape(stop.before)} → ${formatShape(stop.after)}`
            : `${formatShape(stop.after)} (no change)`}
        </p>
        {stop.note ? <p className="m-0 text-sm text-text-muted">{stop.note}</p> : null}
      </div>
      <Link to={`/page/${r.id}`} className="w-fit text-sm font-bold underline underline-offset-4">Open the {r.plain_name} page</Link>
    </section>
  )
}

function Itinerary({
  journey, selectedN, onSelect,
}: { journey: JourneyData; selectedN: number | null; onSelect: (n: number) => void }) {
  const [closed, setClosed] = useState<Set<StageId>>(new Set())
  const toggle = (s: StageId) =>
    setClosed((c) => {
      const n = new Set(c)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })
  const legAfter = (n: number) => journey.legs.find((l) => l.fromN === n)
  return (
    <section aria-labelledby="itinerary-h" className="grid grid-cols-1 gap-2" data-testid="itinerary">
      <h3 id="itinerary-h" className="text-base">Itinerary</h3>
      <ol className="m-0 grid list-none gap-1.5 p-0">
        {journey.stages.map((s) => {
          const { label, Icon } = STAGES[s.stage]
          const skipped = s.status === 'skipped'
          const open = !skipped && !closed.has(s.stage)
          return (
            <li key={s.stage} data-stage={s.stage} className="rounded-md border border-border bg-surface-1">
              {skipped ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
                  <Icon className="size-4" aria-hidden />
                  <span>{label} (skipped)</span>
                  <span className="flex-1" />
                  <span className="inline-flex items-center gap-1 text-xs"><IconPlayerSkipForward className="size-3.5" aria-hidden />Flown over</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(s.stage)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {open ? <IconChevronDown className="size-4" aria-hidden /> : <IconChevronRight className="size-4" aria-hidden />}
                    <span style={{ color: `var(--stage-${s.stage})` }} className="inline-flex"><Icon className="size-4" aria-hidden /></span>
                    <span>{label}</span>
                    <span className="flex-1" />
                    <StatusChip severity={asSeverity(s.status as Stop['status'])} />
                  </button>
                  {open ? (
                    <ol className="m-0 grid list-none gap-1 px-2 pb-2">
                      {s.stops.map((stop) => {
                        const leg = legAfter(stop.n)
                        return (
                          <li key={stop.n}>
                            <button
                              type="button"
                              onClick={() => onSelect(stop.n)}
                              aria-current={selectedN === stop.n ? 'true' : undefined}
                              className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring aria-[current=true]:border-accent aria-[current=true]:bg-surface-2"
                            >
                              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold">{stop.n}</span>
                              <span className="min-w-0 flex-1 truncate">{stop.record.plain_name}</span>
                              <StatusChip severity={asSeverity(stop.status)} />
                            </button>
                            {leg ? (
                              <p className="m-0 flex items-center gap-2 py-1 pl-10 text-xs text-text-muted">
                                Leg to stop {leg.toN}
                                <StatusChip severity={leg.status as Severity} />
                              </p>
                            ) : null}
                          </li>
                        )
                      })}
                    </ol>
                  ) : null}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Build path, short version (T026): a fixed demo pipeline on the globe, then the notebook. */
export default function Journey() {
  const { data: index } = useIndex()
  const [records, setRecords] = useState<ItemRecord[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [fixed, setFixed] = useState<ReadonlySet<string>>(new Set())
  const [selectedN, setSelectedN] = useState<number | null>(null)
  const [mode, setMode] = useState<'globe' | 'notebook'>('globe')
  const [playing, setPlaying] = useState(false)
  const [arrived, setArrived] = useState(false)
  const globe = useRef<GlobeHandle>(null)
  const timers = useRef<number[]>([])
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', false)

  useEffect(() => {
    let live = true
    Promise.all(DEMO_PICK_IDS.map((id) => loadPage(id))).then(
      (pages) => live && setRecords(pages.map((p) => p.record)),
      (e: Error) => live && setError(e),
    )
    return () => {
      live = false
    }
  }, [])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const pageNames = useMemo(() => Object.fromEntries((index?.pages ?? []).map((p) => [p.id, p.plain_name])), [index])
  const journey = useMemo(
    () =>
      records
        ? buildJourney(DEMO_PROFILE, records, DEMO_START_SHAPE, { fixed, shapeOverrides: DEMO_SHAPE_OVERRIDES, pageNames })
        : null,
    [records, fixed, pageNames],
  )
  const cells = useMemo(
    () => (records ? buildCells(DEMO_PROFILE, records.map((record) => ({ record }))) : []),
    [records],
  )

  const select = useCallback(
    (n: number) => {
      setSelectedN(n)
      const stop = journey?.stops.find((s) => s.n === n)
      if (stop) globe.current?.flyTo(stop.position, SELECT_ALTITUDE, reduced ? 0 : 800)
    },
    [journey, reduced],
  )

  const stopPlaying = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setPlaying(false)
  }

  /** Fly passport, every stage in order (skipped ones are flown over), then arrive. Plays once. */
  const play = () => {
    if (!journey || playing) return
    setArrived(false)
    setPlaying(true)
    const flight = reduced ? 0 : 900
    const gap = reduced ? 800 : 1500
    const waypoints = [
      { at: PASSPORT_POSITION, n: null as number | null, alt: 2.5 },
      ...journey.stages.flatMap((s) =>
        s.stops.length
          ? s.stops.map((st) => ({ at: st.position, n: st.n as number | null, alt: SELECT_ALTITUDE }))
          : [{ at: REGION_CENTRES[s.stage], n: null, alt: 2.6 }],
      ),
    ]
    waypoints.forEach((w, i) => {
      timers.current.push(
        window.setTimeout(() => {
          globe.current?.flyTo(w.at, w.alt, flight)
          if (w.n !== null) setSelectedN(w.n)
        }, i * gap),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        globe.current?.overview(flight)
        setPlaying(false)
        setArrived(true)
      }, waypoints.length * gap),
    )
  }

  if (error) {
    return <p role="alert" className="p-6 text-block-text">Could not load the demo journey: {error.message}</p>
  }
  if (!journey) {
    return <p role="status" className="p-6 text-text-muted">Loading the journey...</p>
  }
  if (mode === 'notebook') {
    return (
      <div className="h-full overflow-y-auto">
        <NotebookView cells={cells} onBack={() => setMode('globe')} />
      </div>
    )
  }

  const selected = journey.stops.find((s) => s.n === selectedN) ?? null
  return (
    <div className="jg-root flex h-full min-w-0 flex-col overflow-hidden @container/journey" data-testid="journey">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col @[820px]/journey:flex-row">
        <div className="relative min-h-[260px] min-w-0 flex-1 overflow-hidden @[820px]/journey:min-h-0">
          <JourneyGlobe ref={globe} journey={journey} selectedN={selectedN} onSelect={select} />
          {arrived ? (
            <div className="absolute inset-x-4 bottom-4 flex justify-center">
              <Callout severity="valid" title="You have arrived" className="max-w-md shadow-lg">
                <p className="m-0">All {journey.stops.length} stops are done.</p>
                <Button className="mt-2" onClick={() => setMode('notebook')}><IconNotebook aria-hidden /> Open the notebook</Button>
              </Callout>
            </div>
          ) : null}
        </div>

        <div
          className="flex max-h-[55%] w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-surface-1/80 p-4 @[820px]/journey:max-h-none @[820px]/journey:w-[380px] @[820px]/journey:border-t-0 @[820px]/journey:border-l"
          data-testid="journey-side"
        >
          <div className="flex flex-wrap gap-2">
            {playing ? (
              <Button variant="outline" onClick={stopPlaying}><IconPlayerStop aria-hidden /> Stop</Button>
            ) : (
              <Button variant="outline" onClick={play}><IconPlayerPlay aria-hidden /> Play journey</Button>
            )}
            <Button onClick={() => setMode('notebook')}><IconNotebook aria-hidden /> Open notebook</Button>
          </div>
          <Passport profile={DEMO_PROFILE} shape={DEMO_START_SHAPE} />
          {selected ? (
            <Ticket stop={selected} total={journey.stops.length} fixed={fixed} onFix={(k) => setFixed((f) => new Set(f).add(k))} />
          ) : (
            <p className="m-0 rounded-lg border border-dashed border-border-strong p-4 text-sm text-text-muted">
              Select a stop on the globe or in the itinerary to see its ticket.
            </p>
          )}
          <Itinerary journey={journey} selectedN={selectedN} onSelect={select} />
        </div>
      </div>
    </div>
  )
}
