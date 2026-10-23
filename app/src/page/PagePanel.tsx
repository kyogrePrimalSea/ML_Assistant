import { useIndex } from '@/content/load'

/** Placeholder: T019 replaces this with the real page renderer. */
export function PagePanel({ id }: { id: string }) {
  const { data } = useIndex()
  const page = data?.pages.find((p) => p.id === id)
  return (
    <div className="grid gap-3">
      <h2>{page?.plain_name ?? 'Page'}</h2>
      {page && page.code_name !== page.plain_name ? (
        <p className="font-code text-text-muted">{page.code_name}</p>
      ) : null}
      <p className="text-text-muted">
        Page id: <code>{id}</code>
      </p>
    </div>
  )
}
