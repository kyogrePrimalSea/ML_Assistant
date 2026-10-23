import { useMemo } from 'react'
import { IconArrowLeft, IconDownload } from '@tabler/icons-react'
import { CodeBlock } from '@/components/CodeBlock'
import { Button } from '@/components/ui/button'
import { NOTEBOOK_FILENAME, toIpynb, type Cell } from '@/build/notebook'

function download(cells: Cell[]) {
  const blob = new Blob([toIpynb(cells)], { type: 'application/x-ipynb+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = NOTEBOOK_FILENAME
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Markdown cells here are a title and short paragraphs; render them as plain text, not HTML. */
function MarkdownCell({ source }: { source: string }) {
  const blocks = source.split('\n\n')
  return (
    <div className="grid gap-3">
      {blocks.map((b, i) =>
        b.startsWith('# ') ? (
          <h2 key={i}>{b.slice(2)}</h2>
        ) : (
          <p key={i} className="max-w-[68ch]">
            {b.split('`').map((part, k) => (k % 2 ? <code key={k}>{part}</code> : part))}
          </p>
        ),
      )}
    </div>
  )
}

/** Arrival: the pipeline as a notebook, one cell per stop, each with its own copy button (spec 8). */
export function NotebookView({ cells, onBack }: { cells: Cell[]; onBack: () => void }) {
  const stopCount = useMemo(() => cells.filter((c) => c.label.startsWith('Stop ')).length, [cells])
  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-6 py-6" data-testid="notebook-view">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <IconArrowLeft aria-hidden /> Back to the journey
        </Button>
        <div className="flex-1" />
        <Button onClick={() => download(cells)}>
          <IconDownload aria-hidden /> Download .ipynb
        </Button>
      </div>
      <h2>Your notebook</h2>
      <p className="max-w-[68ch] text-text-muted">
        {stopCount} stops, one cell each. Replace the <code>TODO</code> lines with your column names and file path,
        then run top to bottom.
      </p>
      <ol className="grid list-none gap-5 p-0">
        {cells.map((c, i) => (
          <li key={i} className="grid gap-2" aria-label={c.label}>
            <p className="text-sm font-bold text-text-muted">
              {c.kind === 'code' ? `Cell ${i}. ${c.label}` : c.label}
            </p>
            {c.kind === 'markdown' ? (
              <div className="rounded-lg border border-border bg-surface-1 p-4">
                <MarkdownCell source={c.source} />
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
