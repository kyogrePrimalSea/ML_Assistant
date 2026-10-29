import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconDownload, IconPlus, IconSearch } from '@tabler/icons-react'
import { Callout } from '@/components/Callout'
import { CodeBlock } from '@/components/CodeBlock'
import { STAGES } from '@/components/StageBadge'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { markAll } from '@/build/compat'
import { DEMO_START_SHAPE } from '@/build/demoPipeline'
import { nextQuestion as nextProfileQuestion, narrow, type ProfileAnswers } from '@/build/flow1'
import { nextQuestion as nextFlow2Question, profileOf, recommendModels, type Flow2Answers, type Flow2Proposal } from '@/build/flow2'
import { buildJourney } from '@/build/journey'
import { NOTEBOOK_FILENAME, toIpynb } from '@/build/notebook'
import { buildNotebookV2, TEMPLATED_PAGE_IDS } from '@/build/notebookV2'
import { fullList, proposeForStage, type Proposal } from '@/build/proposals'
import { STAGE_ORDER, type DataProfile, type Pick } from '@/build/validate'
import { familyNames } from '@/content/labels'
import { loadPage, useIndex } from '@/content/load'
import type { ItemRecord, StageId, TaskType } from '@/content/types'
import { useMediaQuery } from '@/shell/useMediaQuery'
import { useShellState } from '@/shell/ShellState'
import { answersFromFlow2, deriveProfile, overridesFromFlow2, type FlagField } from './buildModel'
import { JourneyPanel, MarkChip, NotebookTag, PageSidePanel, ProsCons } from './BuildPanel'
import { BuildGlobeCanvas } from './BuildGlobeCanvas'
import type { GlobeHandle } from './JourneyGlobe'
import './journey.css'
import './BuildGlobe.css'

const SELECT_ALTITUDE = 2.1
const TEMPLATED: ReadonlySet<string> = new Set(TEMPLATED_PAGE_IDS)
/** Stages the user may skip on purpose. The others are needed for a runnable pipeline. */
const OPTIONAL_STAGES: StageId[] = ['explore', 'clean', 'select', 'tune', 'interpret']

type Phase = 'entry' | 'model' | 'profile' | 'stages' | 'help'

/** Load every page that has a record. The pages are small static files, cached after the first visit. */
function useRecords(): { records: ItemRecord[] | null; error: Error | null } {
  const { data: index, error: indexError } = useIndex()
  const [state, setState] = useState<{ records: ItemRecord[] | null; error: Error | null }>({ records: null, error: null })
  useEffect(() => {
    if (!index) return
    let live = true
    Promise.all(index.pages.filter((p) => p.has_record).map((p) => loadPage(p.id))).then(
      (pages) => live && setState({ records: pages.map((p) => p.record), error: null }),
      (error: Error) => live && setState({ records: null, error }),
    )
    return () => { live = false }
  }, [index])
  return { records: state.records, error: indexError ?? state.error }
}

function Card({
  p, picked, onAdd, onRemove, extra,
}: {
  p: Proposal
  picked: boolean
  onAdd: (p: Proposal) => void
  onRemove?: (id: string) => void
  extra?: string[]
}) {
  const [asking, setAsking] = useState(false)
  const add = () => (p.mark === 'red' ? setAsking(true) : onAdd(p))
  return (
    <article className="bld-card" data-testid="proposal" data-mark={p.mark} data-picked={picked} aria-label={p.name}>
      <div className="flex items-start gap-2">
        <h4 className="m-0 min-w-0 flex-1 text-base">{p.name}</h4>
        <ProsCons name={p.name} pros={p.pros} cons={p.cons} reasons={p.reasons} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <MarkChip mark={p.mark} />
        <NotebookTag ready={TEMPLATED.has(p.id)} />
      </div>
      {extra?.map((t) => <p key={t} className="m-0 text-sm text-text-muted">{t}</p>)}
      {picked ? (
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span>In your journey</span>
          {onRemove ? <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>Remove</Button> : null}
        </div>
      ) : asking ? (
        <div className="grid gap-2" role="group" aria-label={`Confirm ${p.name}`}>
          <p className="m-0 text-sm text-block-text">
            {p.reasons.find((i) => i.severity === 'block')?.message ?? 'This does not fit the rest of your journey.'} Add it anyway?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setAsking(false); onAdd(p) }}>Add anyway</Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-fit" onClick={add} aria-label={`Add ${p.name}`}>
          <IconPlus aria-hidden /> Add to journey
        </Button>
      )}
    </article>
  )
}

function Choice({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="bld-card text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-ring">
      <span className="text-lg font-bold">{label}</span>
      <span className="text-sm text-text-muted">{hint}</span>
    </button>
  )
}

function Question({
  text, choices, onAnswer, onSkip, count,
}: {
  text: string
  choices: { value: boolean | string; label: string }[]
  onAnswer: (v: boolean | string) => void
  onSkip: () => void
  count?: string
}) {
  return (
    <section aria-labelledby="bld-q" className="grid max-w-[68ch] gap-3" data-testid="question">
      {count ? <p className="m-0 text-sm text-text-muted">{count}</p> : null}
      <h3 id="bld-q" className="m-0 text-lg">{text}</h3>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => <Button key={String(c.value)} variant="outline" onClick={() => onAnswer(c.value)}>{c.label}</Button>)}
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </section>
  )
}

function NotebookScreen({ picks, profile, onBack }: { picks: Pick[]; profile: DataProfile; onBack: () => void }) {
  const nb = useMemo(() => buildNotebookV2(picks, profile), [picks, profile])
  const download = () => {
    const url = URL.createObjectURL(new Blob([toIpynb(nb.cells)], { type: 'application/x-ipynb+json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = NOTEBOOK_FILENAME
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-6 py-6" data-testid="build-notebook">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}><IconArrowLeft aria-hidden /> Back to the journey</Button>
        <div className="flex-1" />
        <Button onClick={download}><IconDownload aria-hidden /> Download .ipynb</Button>
      </div>
      <h2>Your notebook</h2>
      <p className="max-w-[68ch] text-text-muted">
        {nb.cells.length} cells. Replace the <code>TODO</code> lines with your column names and file path, then run top to bottom.
      </p>
      {picks.length === 0 ? <Callout severity="tip" title="Nothing picked yet">The notebook below only has the title and setup cells.</Callout> : null}
      {nb.warnings.length > 0 ? (
        <div data-testid="nb-warnings"><Callout severity="warn" title="Warnings">
          <ul className="m-0 pl-5">{nb.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Callout></div>
      ) : null}
      {nb.gaps.length > 0 ? (
        <div data-testid="nb-gaps"><Callout severity="tip" title="Gaps: no fixed template yet">
          <ul className="m-0 pl-5">{nb.gaps.map((g) => <li key={g.id}>{g.plain_name} ({STAGES[g.stage].label}) gets a TODO cell.</li>)}</ul>
        </Callout></div>
      ) : null}
      <ol className="grid list-none gap-5 p-0">
        {nb.cells.map((c, i) => (
          <li key={i} className="grid gap-2" aria-label={c.label}>
            <p className="text-sm font-bold text-text-muted">{c.kind === 'code' ? `Cell ${i}. ${c.label}` : c.label}</p>
            {c.kind === 'markdown' ? (
              <div className="grid gap-2 rounded-lg border border-border bg-surface-1 p-4">
                {c.source.split('\n\n').map((b, k) => (
                  b.startsWith('# ') ? <h3 key={k}>{b.slice(2)}</h3> : <p key={k} className="max-w-[68ch]">{b.split('`').map((part, j) => (j % 2 ? <code key={j}>{part}</code> : part))}</p>
                ))}
              </div>
            ) : (
              <CodeBlock code={c.source} />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Build (beta): the globe build journey (spec 8.1). A new view beside Journey; Journey is untouched. */
export default function BuildGlobe() {
  const { data: index } = useIndex()
  const { records, error } = useRecords()
  const shell = useShellState()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', false)
  const globe = useRef<GlobeHandle>(null)
  const pageTrigger = useRef<HTMLElement | null>(null)

  const [phase, setPhase] = useState<Phase>('entry')
  const [pickIds, setPickIds] = useState<string[]>([])
  const [answers1, setAnswers1] = useState<ProfileAnswers>({})
  const [answers2, setAnswers2] = useState<Flow2Answers>({})
  const [overrides, setOverrides] = useState<Partial<DataProfile>>({})
  const [stage, setStage] = useState<StageId>('explore')
  const [fullOpen, setFullOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedN, setSelectedN] = useState<number | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [notebook, setNotebook] = useState(false)
  const [showNow, setShowNow] = useState(false)
  const [skipped, setSkipped] = useState<ReadonlySet<StageId>>(new Set())

  const byId = useMemo(() => new Map((records ?? []).map((r) => [r.id, r])), [records])
  const picks: Pick[] = useMemo(() => pickIds.flatMap((id) => (byId.has(id) ? [{ record: byId.get(id)! }] : [])), [pickIds, byId])
  const pickRecords = useMemo(() => picks.map((p) => p.record), [picks])
  const model = pickRecords.find((r) => r.stage === 'model') ?? null
  const helping = Object.keys(answers2).length > 0
  const profile = useMemo(
    () => deriveProfile({ task: shell.task, track: shell.track }, model, answers1, helping ? answers2 : null, overrides),
    [shell.task, shell.track, model, answers1, answers2, helping, overrides],
  )
  const opts = useMemo(
    () => ({ pageNames: Object.fromEntries((index?.pages ?? []).map((p) => [p.id, p.plain_name])), familyNames: familyNames(index) }),
    [index],
  )
  const marks = useMemo(() => markAll(picks, picks, profile, opts), [picks, profile, opts])
  const journey = useMemo(() => buildJourney(profile, pickRecords, DEMO_START_SHAPE, opts), [profile, pickRecords, opts])

  const select = useCallback(
    (n: number) => {
      setSelectedN(n)
      const stop = journey.stops.find((s) => s.n === n)
      if (stop) globe.current?.flyTo(stop.position, SELECT_ALTITUDE, reduced ? 0 : 800)
    },
    [journey, reduced],
  )
  const focusStage = journey.stops.find((s) => s.n === selectedN)?.record.stage ?? null

  const addPick = (id: string) => {
    const r = byId.get(id)
    setPickIds((ids) => [...ids.filter((x) => x !== id && !(r?.stage === 'model' && byId.get(x)?.stage === 'model')), id])
    setSelectedN(null)
    if (r) setSkipped((s) => { if (!s.has(r.stage)) return s; const n = new Set(s); n.delete(r.stage); return n })
  }
  const removePick = (id: string) => {
    setPickIds((ids) => ids.filter((x) => x !== id))
    setSelectedN(null)
    if (byId.get(id)?.stage === 'model') setPhase((p) => (p === 'profile' || p === 'stages' ? 'model' : p))
  }
  const reset = () => {
    setPhase('entry'); setPickIds([]); setAnswers1({}); setAnswers2({}); setOverrides({}); setStage('explore')
    setFullOpen(false); setSearch(''); setSelectedN(null); setPageId(null); setNotebook(false); setShowNow(false); setSkipped(new Set())
  }
  const chooseModel = (id: string, fromHelp: boolean) => {
    addPick(id)
    if (fromHelp) {
      setAnswers1(answersFromFlow2(answers2))
      setOverrides(overridesFromFlow2(answers2))
      setPhase('stages')
      setStage('explore')
    } else {
      setAnswers1({})
      setPhase('profile')
    }
  }
  const openPage = (id: string, trigger?: HTMLElement) => {
    if (trigger) pageTrigger.current = trigger
    setPageId(id)
  }
  const closePage = () => {
    setPageId(null)
    const t = pageTrigger.current
    if (t?.isConnected) window.setTimeout(() => t.focus(), 0)
  }
  const setFlag = (f: FlagField, v: boolean) =>
    setOverrides((o) => ({ ...o, [f]: v, ...(f === 'time_ordered' ? { track: v ? 'time-series' : 'standard' } : {}) }) as Partial<DataProfile>)
  const setTask = (t: TaskType) => setOverrides((o) => ({ ...o, task_type: t }))
  const toggleSkip = (s: StageId) =>
    setSkipped((cur) => { const n = new Set(cur); if (n.has(s)) n.delete(s); else n.add(s); return n })
  const toStage = (s: StageId) => { setStage(s); setFullOpen(false) }

  if (error) return <p role="alert" className="p-6 text-block-text">Could not load the pages: {error.message}</p>
  if (!records) return <p role="status" className="p-6 text-text-muted">Loading the guide...</p>

  if (notebook) {
    return (
      <div className="bld-root h-full overflow-y-auto">
        <NotebookScreen picks={picks} profile={profile} onBack={() => setNotebook(false)} />
      </div>
    )
  }

  const modelRecords = records.filter((r) => r.stage === 'model')
  const q = search.trim().toLowerCase()
  const shownModels = modelRecords.filter((r) => !q || [r.plain_name, r.code_name, ...r.aliases].some((t) => t.toLowerCase().includes(q)))
  const profileQ = phase === 'profile' && model ? nextProfileQuestion(model, answers1) : null
  const inStages = phase === 'stages' || (phase === 'profile' && !profileQ && model !== null)

  let body
  if (phase === 'entry') {
    body = (
      <section aria-labelledby="bld-entry" className="grid max-w-3xl gap-4">
        <h2 id="bld-entry" className="m-0 text-xl">How do you want to start?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice label="I know my model" hint="Pick the model first, then narrow the steps around it." onClick={() => setPhase('model')} />
          <Choice label="Help me choose a model" hint="Answer a few questions about your prediction and your data." onClick={() => setPhase('help')} />
        </div>
      </section>
    )
  } else if (phase === 'model') {
    body = (
      <section aria-labelledby="bld-model" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPhase('entry')}><IconArrowLeft aria-hidden /> Back</Button>
          <h2 id="bld-model" className="m-0 text-xl">Pick your model</h2>
        </div>
        <label className="flex max-w-md items-center gap-2 rounded-md border border-border-strong bg-surface-1 px-3">
          <IconSearch className="size-4 text-text-muted" aria-hidden />
          <span className="sr-only">Search models</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models"
            className="h-10 w-full bg-transparent text-text outline-none placeholder:text-text-muted"
          />
        </label>
        <ul className="bld-cards m-0 list-none p-0" aria-label="Models">
          {shownModels.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => chooseModel(r.id, false)}
                className="bld-card w-full text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="font-bold">{r.plain_name}</span>
                <span className="text-sm text-text-muted"><code>{r.code_name}</code></span>
              </button>
            </li>
          ))}
        </ul>
        {shownModels.length === 0 ? <p className="m-0 text-text-muted">No model matches &ldquo;{search}&rdquo;.</p> : null}
      </section>
    )
  } else if (phase === 'profile' && profileQ) {
    const asked = Object.values(answers1).filter((v) => v !== undefined).length
    body = (
      <div className="grid gap-3">
        <p className="m-0 text-sm">Model: <span className="font-bold">{model?.plain_name}</span>. These questions only narrow the steps; you still choose.</p>
        <Question
          text={profileQ.text}
          count={`Question ${asked + 1}`}
          choices={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
          onAnswer={(v) => setAnswers1((a) => ({ ...a, [profileQ.id]: v as boolean }))}
          onSkip={() => setAnswers1((a) => ({ ...a, [profileQ.id]: null }))}
        />
        <Button variant="ghost" className="w-fit" onClick={() => { setPhase('stages'); setStage('explore') }}>Skip all questions</Button>
      </div>
    )
  } else if (inStages && model) {
    const narrowed = new Set(narrow(stage, answers1, model, records))
    const proposals = stage === 'model' ? [] : proposeForStage(stage, picks, profile, records.filter((r) => narrowed.has(r.id)))
    const all = fullOpen ? fullList(stage, picks, profile, records) : []
    const picked = new Set(pickIds)
    const idx = STAGE_ORDER.indexOf(stage)
    body = (
      <div className="grid gap-4">
        <nav aria-label="Stages" className="flex flex-wrap gap-2">
          {STAGE_ORDER.map((s) => {
            const { label, Icon } = STAGES[s]
            const has = pickRecords.some((r) => r.stage === s)
            return (
              <button key={s} type="button" className="bld-step" aria-current={s === stage ? 'step' : undefined} onClick={() => toStage(s)}>
                <span style={{ color: `var(--stage-${s})` }} className="inline-flex"><Icon aria-hidden /></span>
                {label}
                {has ? <span className="text-xs font-normal text-text-muted">(picked)</span> : null}
              </button>
            )
          })}
        </nav>
        <section aria-labelledby="bld-stage" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="bld-stage" className="m-0 text-xl">{STAGES[stage].label}</h2>
            {OPTIONAL_STAGES.includes(stage) && !pickRecords.some((r) => r.stage === stage) ? (
              skipped.has(stage) ? (
                <>
                  <span className="text-sm font-bold text-text-muted">Skipped</span>
                  <Button size="sm" variant="ghost" onClick={() => toggleSkip(stage)}>Undo skip</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggleSkip(stage)} aria-label={`Skip ${STAGES[stage].label}`}>
                  Skip {STAGES[stage].label}
                </Button>
              )
            ) : null}
          </div>
          {stage === 'model' ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="m-0">Your model is <span className="font-bold">{model.plain_name}</span>.</p>
              <Button variant="outline" size="sm" onClick={() => setPhase('model')}>Change model</Button>
            </div>
          ) : (
            <>
              <p className="m-0 max-w-[68ch] text-sm text-text-muted">
                {proposals.length > 0 ? 'Up to four steps that fit what you told us. You choose; nothing is added for you.' : 'No more proposals for this stage.'}
              </p>
              {proposals.length > 0 ? (
                <div className="bld-cards" aria-label="Proposals">
                  {proposals.map((p) => <Card key={p.id} p={p} picked={picked.has(p.id)} onAdd={(x) => addPick(x.id)} />)}
                </div>
              ) : null}
              <Button variant="outline" className="w-fit" aria-expanded={fullOpen} onClick={() => setFullOpen((o) => !o)}>
                {fullOpen ? 'Hide the full list' : 'Choose from the full list'}
              </Button>
              {fullOpen ? (
                all.length > 0 ? (
                  <div className="bld-cards" aria-label="Full list">
                    {all.map((p) => <Card key={p.id} p={p} picked={picked.has(p.id)} onAdd={(x) => addPick(x.id)} onRemove={removePick} />)}
                  </div>
                ) : <p className="m-0 text-text-muted">There are no pages for this stage yet.</p>
              ) : null}
            </>
          )}
        </section>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={idx === 0} onClick={() => toStage(STAGE_ORDER[idx - 1])}><IconArrowLeft aria-hidden /> Previous stage</Button>
          <Button variant="outline" disabled={idx === STAGE_ORDER.length - 1} onClick={() => toStage(STAGE_ORDER[idx + 1])}>
            {pickRecords.some((r) => r.stage === stage) ? 'Next stage' : 'Skip this stage'} <IconArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    )
  } else {
    // Flow 2: questions, then model proposals.
    const fq = nextFlow2Question(answers2)
    const ready = profileOf(answers2) !== null
    const set = (field: keyof Flow2Answers, v: unknown) => setAnswers2((a) => ({ ...a, [field]: v }) as Flow2Answers)
    const recs: Flow2Proposal[] = ready && (!fq || showNow) ? recommendModels(answers2, records) : []
    body = (
      <section aria-labelledby="bld-help" className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setAnswers2({}); setShowNow(false); setPhase('entry') }}><IconArrowLeft aria-hidden /> Back</Button>
          <h2 id="bld-help" className="m-0 text-xl">Help me choose a model</h2>
        </div>
        {fq ? (
          <Question
            text={fq.text}
            choices={fq.choices ? fq.choices.map((c) => ({ value: c.value, label: c.label })) : [{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
            onAnswer={(v) => set(fq.field, v)}
            onSkip={() => set(fq.field, null)}
          />
        ) : null}
        {ready && fq ? <Button variant="outline" className="w-fit" onClick={() => setShowNow(true)}>Show models now</Button> : null}
        {!fq && recs.length === 0 ? (
          <p className="m-0 text-text-muted">Answer the outcome type and time order to see models.</p>
        ) : null}
        {recs.length > 0 ? (
          <>
            <h3 className="m-0 text-lg">Models that fit your answers</h3>
            <div className="bld-cards" aria-label="Model proposals">
              {recs.map((p) => <Card key={p.id} p={p} picked={false} onAdd={(x) => chooseModel(x.id, true)} extra={p.notes.map((n) => n.message).slice(0, 2)} />)}
            </div>
          </>
        ) : null}
      </section>
    )
  }

  return (
    <TooltipProvider>
      <div className="bld-root flex h-full min-w-0 overflow-hidden @container/build" data-testid="build">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-[260px] flex-[3] overflow-hidden">
            <BuildGlobeCanvas ref={globe} journey={journey} selectedN={selectedN} onSelect={select} skipped={skipped} />
          </div>
          <div className="min-h-0 flex-[2] overflow-y-auto border-t border-border bg-bg p-5" data-testid="build-workbench">
            {body}
          </div>
        </div>
        <aside aria-label="Journey panel" className="bld-panel w-[320px] shrink-0 @[1200px]/build:w-[360px]" data-testid="build-journey-side">
          <JourneyPanel
            profile={profile}
            onFlag={setFlag}
            onTask={setTask}
            picks={pickRecords}
            marks={marks}
            focusStage={focusStage}
            onRemove={removePick}
            onOpenPage={openPage}
            onNotebook={() => setNotebook(true)}
            onReset={reset}
          />
        </aside>
        {pageId ? <PageSidePanel key="page" id={pageId} onClose={closePage} onNavigate={(id) => setPageId(id)} /> : null}
      </div>
    </TooltipProvider>
  )
}
