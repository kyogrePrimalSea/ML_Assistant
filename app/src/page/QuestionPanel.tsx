import { Link } from 'react-router'
import { IconMessageQuestion } from '@tabler/icons-react'
import { StageBadge } from '@/components/StageBadge'
import { useIndex } from '@/content/load'

/** A symptom question and its answers: links to the pages, with the setting and note where there is one. */
export function QuestionPanel({ id }: { id: string }) {
  const { data } = useIndex()
  const q = data?.questions.find((x) => x.id === id)
  if (!data) return <p role="status" className="text-text-muted">Loading…</p>
  if (!q) return <p role="status">That question is not in the guide.</p>
  const stem = data.vocab.question_stems.find((s) => s.id === q.stem)?.name
  const page = (pid: string) => data.pages.find((p) => p.id === pid)
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="m-0 inline-flex items-center gap-1.5 text-sm text-text-muted">
          <IconMessageQuestion aria-hidden className="size-4" /> {stem}
        </p>
        <h2 className="m-0">{q.text}</h2>
        <StageBadge stage={q.stage} />
      </div>
      <section aria-labelledby="q-answers" className="grid gap-2">
        <h3 id="q-answers" className="m-0 text-base">Answers</h3>
        <ul className="m-0 grid list-none gap-3 p-0">
          {q.answers.map((a, i) => (
            <li key={`${a.page}-${a.setting ?? i}`} className="grid gap-0.5">
              <Link to={`/page/${a.page}`} className="font-bold">
                {page(a.page)?.plain_name ?? a.page}
              </Link>
              {a.setting ? (
                <span className="text-sm text-text-muted">
                  Setting: <code>{a.setting}</code>
                </span>
              ) : null}
              {a.note ? <span className="text-sm text-text-muted">{a.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>
      {q.next.length > 0 ? (
        <section aria-labelledby="q-next" className="grid gap-2">
          <h3 id="q-next" className="m-0 text-base">Next</h3>
          <ul className="m-0 grid list-none gap-1 p-0">
            {q.next.map((n) => (
              <li key={n}>
                <Link to={`/question/${n}`}>{data.questions.find((x) => x.id === n)?.text ?? n}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
