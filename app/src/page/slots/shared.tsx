import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/** One slot: same heading style, same rule above, same spacing, every page. */
export function Slot({
  name,
  title,
  children,
  heading,
}: {
  name: string
  title: string
  children: ReactNode
  /** Replaces the plain heading (the collapsed Intuition slot puts its toggle inside it). */
  heading?: ReactNode
}) {
  const id = `slot-${name}`
  return (
    <section
      data-slot-name={name}
      aria-labelledby={id}
      className="mt-8 grid min-w-0 grid-cols-1 gap-4 border-t border-border pt-6"
    >
      <h3 id={id} className="m-0">
        {heading ?? title}
      </h3>
      {children}
    </section>
  )
}

export function None() {
  return <p className="m-0 text-text-muted">None</p>
}

/** Short neutral tag. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border border-border-strong px-3 py-0.5 text-sm text-text',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function TagList({ tags, label, icon }: { tags: string[]; label: string; icon?: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="m-0 flex items-center gap-1.5 text-sm font-bold text-text">
        {icon}
        {label}
      </p>
      {tags.length === 0 ? (
        <None />
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {tags.map((t) => (
            <li key={t}>
              <Tag>{t}</Tag>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Quiet inline link to another page. */
export function PageLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link to={`/page/${id}`} className={className}>
      {children}
    </Link>
  )
}

/** Stand-in for a visual that a later epic builds. Always the same shape, so nothing shifts later. */
export function Frame({ icon, label, detail }: { icon: ReactNode; label: string; detail?: string }) {
  return (
    <div
      data-frame
      className="grid min-h-36 content-center justify-items-start gap-1 rounded-lg border border-dashed border-border-strong bg-surface-2 p-5 text-text-muted"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-text">
        {icon}
        {label}
      </span>
      {detail ? <span className="text-sm">{detail}</span> : null}
    </div>
  )
}
