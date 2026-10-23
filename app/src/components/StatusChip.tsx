import type { ComponentType, ReactNode } from 'react'
import { IconAlertTriangle, IconBulb, IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export type Severity = 'block' | 'warn' | 'tip' | 'valid'

/** Severity is always icon + label + filled colour, never colour alone (spec 10.3). */
export const SEVERITY: Record<
  Severity,
  { label: string; Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; chip: string; callout: string }
> = {
  block: {
    label: 'Blocked',
    Icon: IconCircleX,
    chip: 'bg-block-bg text-block-text border-block-text/40',
    callout: 'bg-block-bg text-block-text border-block-text/40',
  },
  warn: {
    label: 'Warning',
    Icon: IconAlertTriangle,
    chip: 'bg-warn-bg text-warn-text border-warn-text/40',
    callout: 'bg-warn-bg text-warn-text border-warn-text/40',
  },
  tip: {
    label: 'Tip',
    Icon: IconBulb,
    chip: 'bg-tip-bg text-tip-text border-tip-text/40',
    callout: 'bg-tip-bg text-tip-text border-tip-text/40',
  },
  valid: {
    label: 'Valid',
    Icon: IconCircleCheck,
    chip: 'bg-valid-bg text-valid-text border-valid-text/40',
    callout: 'bg-valid-bg text-valid-text border-valid-text/40',
  },
}

export function StatusChip({
  severity,
  children,
  className,
}: {
  severity: Severity
  /** Overrides the default label (Blocked, Warning, Tip, Valid). */
  children?: ReactNode
  className?: string
}) {
  const { label, Icon, chip } = SEVERITY[severity]
  return (
    <span
      data-slot="status-chip"
      data-severity={severity}
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        chip,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children ?? label}
    </span>
  )
}
