import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import type { WatchItWork as WatchData } from '@/content/types'
import { useCatalogue } from './context'
import { Frame, None, Slot } from './shared'

export function WatchItWork({ data }: { data: WatchData }) {
  const { datasetName } = useCatalogue()
  return (
    <Slot name="watch_it_work" title="Watch it work">
      {'none' in data ? (
        <None />
      ) : (
        <Frame
          icon={<IconAdjustmentsHorizontal className="size-4" aria-hidden />}
          label={`Slider: ${data.control.name}`}
          detail={`Dataset ${datasetName(data.dataset)} · ${data.control.min} to ${data.control.max}, start at ${data.control.default}`}
        />
      )}
    </Slot>
  )
}
