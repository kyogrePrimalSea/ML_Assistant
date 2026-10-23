import type { ComponentType } from 'react'
import {
  IconAdjustmentsHorizontal,
  IconArrowsSplit2,
  IconCube,
  IconDatabaseExport,
  IconFilter,
  IconRulerMeasure,
  IconScale,
  IconStack2,
  IconStethoscope,
  IconTarget,
  IconTransform,
} from '@tabler/icons-react'
import type { ArchetypeId } from '@/content/types'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

/** Matches the icon names in vocab.yaml archetypes. */
export const ARCHETYPE_ICONS: Record<ArchetypeId, IconType> = {
  transformer: IconTransform,
  resampler: IconScale,
  selector: IconFilter,
  splitter: IconArrowsSplit2,
  model: IconCube,
  hyperparameter: IconAdjustmentsHorizontal,
  tuning: IconTarget,
  metric: IconRulerMeasure,
  diagnostic: IconStethoscope,
  output: IconDatabaseExport,
  composer: IconStack2,
}
