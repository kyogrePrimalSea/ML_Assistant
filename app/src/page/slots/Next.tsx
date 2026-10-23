import { IconMessageQuestion } from '@tabler/icons-react'
import { Link } from 'react-router'
import { useCatalogue } from './context'
import { None, Slot } from './shared'

export function Next({ ids }: { ids: string[] }) {
  const { questionText } = useCatalogue()
  return (
    <Slot name="next" title="Next">
      {ids.length === 0 ? (
        <None />
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {ids.map((id) => (
            <li key={id}>
              <Link
                to={`/question/${id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm text-text no-underline hover:bg-surface-2 hover:text-text"
              >
                <IconMessageQuestion className="size-4 shrink-0" aria-hidden />
                {questionText(id)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Slot>
  )
}
