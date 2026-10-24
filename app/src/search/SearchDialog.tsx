import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { IconArrowsExchange, IconCategory, IconFileText, IconFolders, IconMessageQuestion, IconRoute2 } from '@tabler/icons-react'
import { Command as CommandPrimitive } from 'cmdk'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { STAGES } from '@/components/StageBadge'
import { useIndex } from '@/content/load'
import { useShellState } from '@/shell/ShellState'
import { IconSearch } from '@tabler/icons-react'
import { buildSearchDocs, displayOf, runSearch, type SearchKind, type SearchResult } from './search'

const KINDS: Record<SearchKind, { label: string; Icon: typeof IconFileText }> = {
  stage: { label: 'Stage', Icon: IconRoute2 },
  group: { label: 'Group', Icon: IconFolders },
  family: { label: 'Family', Icon: IconCategory },
  page: { label: 'Page', Icon: IconFileText },
  question: { label: 'Question', Icon: IconMessageQuestion },
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data } = useIndex()
  const { goal, setGoal, labels, revealNode, setView } = useShellState()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const docs = useMemo(() => (data ? buildSearchDocs(data) : []), [data])
  const results = useMemo(() => runSearch(docs, query, goal), [docs, query, goal])
  const goals = data?.taxonomy?.goals ?? []
  const goalName = (id: string) => {
    const g = goals.find((x) => x.id === id)
    return g ? (labels === 'questions' ? g.question_label : g.names_label) : id
  }

  const total = results.here.length + results.other.length
  const announce = query.trim() === '' ? '' : total === 0 ? 'No results' : `${total} ${total === 1 ? 'result' : 'results'}`

  const pick = (r: SearchResult) => {
    const d = r.doc
    if (!r.inGoal && d.goals[0]) setGoal(d.goals[0])
    onOpenChange(false)
    if (d.kind === 'question') navigate(`/question/${d.id}`)
    else {
      setView('tree')
      revealNode(d.id)
      if (d.kind === 'page') navigate(`/page/${d.id}`)
    }
  }

  const goalsText = (ids: string[]) => (ids.length === goals.length ? 'All goals' : ids.map(goalName).join(', '))

  const row = (r: SearchResult) => {
    const d = r.doc
    const { label, second } = displayOf(d, labels, goal)
    const stage = STAGES[d.stage]
    const kind = KINDS[d.kind]
    const switchTo = !r.inGoal && d.goals[0] ? goalName(d.goals[0]) : null
    return (
      <CommandItem key={d.key} value={d.key} onSelect={() => pick(r)} className="items-start gap-3">
        <stage.Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${stage.text}`} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-bold text-text">{label}</span>
          {second ? <span className="text-xs text-text-muted">{second}</span> : null}
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <kind.Icon aria-hidden className="size-3.5" />
              {kind.label}
            </span>
            <span>{stage.label}</span>
            <span>{goalsText(d.goals)}</span>
          </span>
          {switchTo ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-text">
              <IconArrowsExchange aria-hidden className="size-3.5" />
              Switch goal to {switchTo} and open
            </span>
          ) : null}
        </span>
      </CommandItem>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setQuery('')
        onOpenChange(o)
      }}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>Search pages, groups, families and questions, in either label set.</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <Command shouldFilter={false} loop>
          <div data-slot="command-input-wrapper" className="flex h-12 items-center gap-2 border-b px-3">
            <IconSearch aria-hidden className="size-5 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, questions and labels"
              className="h-10 w-full bg-transparent text-sm outline-hidden placeholder:text-text-muted"
            />
          </div>
          <div role="status" aria-live="polite" className="sr-only">
            {announce}
          </div>
          <CommandList className="max-h-[420px]">
            {query.trim() === '' ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Type a name, a code name or a question, like “rare class”.</p>
            ) : total === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Nothing matches “{query.trim()}”. Try fewer or simpler words.</p>
            ) : null}
            {results.here.length > 0 ? <CommandGroup heading={`In ${goalName(goal)}`}>{results.here.map(row)}</CommandGroup> : null}
            {results.other.length > 0 ? <CommandGroup heading="Other goals">{results.other.map(row)}</CommandGroup> : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
