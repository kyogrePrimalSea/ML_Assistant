import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SEVERITY, type Severity } from './StatusChip'

/** Filled callout: severity icon, a bold label, then the message (spec 10.3). */
export function Callout({
  severity,
  title,
  children,
  className,
}: {
  severity: Severity
  /** Overrides the default label (Blocked, Warning, Tip, Valid). */
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const { label, Icon, callout } = SEVERITY[severity]
  return (
    <div
      role="note"
      data-slot="callout"
      data-severity={severity}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', callout, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-bold">{title ?? label}</p>
        {children ? <div className="mt-1">{children}</div> : null}
      </div>
    </div>
  )
}
