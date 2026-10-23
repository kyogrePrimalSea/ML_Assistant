import { IconPhoto } from '@tabler/icons-react'
import type { Solves as SolvesData, None as NoneData } from '@/content/types'
import { useCatalogue } from './context'
import { Frame, None, Slot } from './shared'

function heroDetail(hero: SolvesData['hero']): string | undefined {
  switch (hero.kind) {
    case 'model':
      return hero.shape === 'fit_line' ? 'Fit line forming' : 'Decision boundary forming'
    case 'hyperparameter':
      return `Sweep ${hero.sweep.join(', ')}`
    case 'splitter':
      return `${hero.rows} rows, ${hero.folds} folds`
    case 'tuning':
      return `${hero.trials} trials in ${hero.dims} dimensions`
    case 'composer':
      return hero.boxes.join(' → ')
    case 'diagnostic':
      return hero.chart
    case 'output':
      return `${hero.plot} plot`
    default:
      return undefined
  }
}

export function Solves({ data }: { data: SolvesData | NoneData }) {
  const { archetypeName, datasetName } = useCatalogue()
  if ('none' in data) {
    return (
      <Slot name="solves" title="Solves">
        <None />
      </Slot>
    )
  }
  const { hero, line } = data
  const dataset = 'dataset' in hero ? `Dataset ${datasetName(hero.dataset)}` : undefined
  const detail = [heroDetail(hero), dataset].filter(Boolean).join(' · ')
  return (
    <Slot name="solves" title="Solves">
      <p className="m-0 text-lg">{line}</p>
      <Frame
        icon={<IconPhoto className="size-4" aria-hidden />}
        label={`Hero visual: ${archetypeName(hero.kind).toLowerCase()}`}
        detail={detail || undefined}
      />
    </Slot>
  )
}
