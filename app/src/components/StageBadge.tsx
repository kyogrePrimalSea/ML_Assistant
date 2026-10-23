import type { ComponentType } from 'react'
import {
  IconAdjustments,
  IconArrowsSplit2,
  IconCube,
  IconEraser,
  IconEye,
  IconFilter,
  IconRulerMeasure,
  IconTelescope,
  IconTransform,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export type Stage =
  | 'explore'
  | 'clean'
  | 'transform'
  | 'select'
  | 'split'
  | 'model'
  | 'tune'
  | 'evaluate'
  | 'interpret'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

/** Stage colour and icon always travel together (spec 10.4). Classes are written out so Tailwind sees them. */
export const STAGES: Record<Stage, { label: string; Icon: IconType; border: string; text: string; dot: string }> = {
  explore: { label: 'Explore', Icon: IconTelescope, border: 'border-stage-explore', text: 'text-stage-explore', dot: 'bg-stage-explore' },
  clean: { label: 'Clean', Icon: IconEraser, border: 'border-stage-clean', text: 'text-stage-clean', dot: 'bg-stage-clean' },
  transform: { label: 'Transform', Icon: IconTransform, border: 'border-stage-transform', text: 'text-stage-transform', dot: 'bg-stage-transform' },
  select: { label: 'Select', Icon: IconFilter, border: 'border-stage-select', text: 'text-stage-select', dot: 'bg-stage-select' },
  split: { label: 'Split', Icon: IconArrowsSplit2, border: 'border-stage-split', text: 'text-stage-split', dot: 'bg-stage-split' },
  model: { label: 'Model', Icon: IconCube, border: 'border-stage-model', text: 'text-stage-model', dot: 'bg-stage-model' },
  tune: { label: 'Tune', Icon: IconAdjustments, border: 'border-stage-tune', text: 'text-stage-tune', dot: 'bg-stage-tune' },
  evaluate: { label: 'Evaluate', Icon: IconRulerMeasure, border: 'border-stage-evaluate', text: 'text-stage-evaluate', dot: 'bg-stage-evaluate' },
  interpret: { label: 'Interpret', Icon: IconEye, border: 'border-stage-interpret', text: 'text-stage-interpret', dot: 'bg-stage-interpret' },
}

/** Outline badge: stage-coloured outline, dot and icon with a neutral label. Never filled. */
export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const { label, Icon, border, text, dot } = STAGES[stage]
  return (
    <span
      data-slot="stage-badge"
      data-stage={stage}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] bg-transparent py-0.5 pr-2.5 pl-2 text-xs font-bold whitespace-nowrap text-text',
        border,
        className,
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', dot)} aria-hidden />
      <Icon className={cn('size-3.5 shrink-0', text)} aria-hidden />
      {label}
    </span>
  )
}
