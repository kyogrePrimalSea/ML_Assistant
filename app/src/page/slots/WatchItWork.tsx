import { useEffect, useRef, useState } from 'react'
import { IconAdjustmentsHorizontal, IconCircleCheck, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import type { WatchItWork as WatchData } from '@/content/types'
import { Slider } from '@/components/ui/slider'
import { loadScene } from '@/cutscenes/loadScene'
import { watchSceneFor } from '@/cutscenes/types'
import { HyperView, nearestIndex, STATUS, verdictAt, type HyperData, type Verdict } from '@/cutscenes/scenes/Hyperparameter'
import { useCatalogue } from './context'
import { Frame, None, Slot } from './shared'

const ICON: Record<Verdict, typeof IconTrendingDown> = { under: IconTrendingDown, best: IconCircleCheck, over: IconTrendingUp }

function Placeholder({ data }: { data: Exclude<WatchData, { none: true }> }) {
  const { datasetName } = useCatalogue()
  return (
    <Frame
      icon={<IconAdjustmentsHorizontal className="size-4" aria-hidden />}
      label={`Slider: ${data.control.name}`}
      detail={`Dataset ${datasetName(data.dataset)} · ${data.control.min} to ${data.control.max}, start at ${data.control.default}`}
    />
  )
}

/** Slider over the stored sweep: moving it redraws both panels at once, with no animation. */
function Sweep({ data, scene }: { data: Exclude<WatchData, { none: true }>; scene: HyperData }) {
  const { control } = data
  const [value, setValue] = useState(control.default)
  const i = nearestIndex(scene.sweep_values, value)
  const verdict = verdictAt(scene, i)
  const Icon = ICON[verdict]

  // Spoken status waits for the slider to rest, so dragging does not flood a screen reader.
  const [spoken, setSpoken] = useState('')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => setSpoken(STATUS[verdict]), 600)
    return () => clearTimeout(t)
  }, [verdict, value])

  return (
    <div data-watch={scene.id} className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="grid gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <span id="watch-label" className="text-sm font-bold text-text">
            Try <code>{control.name}</code>
          </span>
          <output
            aria-labelledby="watch-label"
            data-watch-value
            className="text-lg font-bold text-text"
            style={{ fontFamily: 'var(--font-atkinson)', fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </output>
        </div>
        <Slider
          aria-labelledby="watch-label"
          min={control.min}
          max={control.max}
          step={control.step}
          value={[value]}
          onValueChange={([v]) => setValue(v)}
        />
      </div>
      <HyperView data={scene} value={value} />
      <p className="m-0 flex items-center gap-2 text-text" data-watch-status data-verdict={verdict} aria-hidden>
        <Icon className="size-5 shrink-0" />
        {STATUS[verdict]}
      </p>
      <p className="sr-only" aria-live="polite" role="status">
        {spoken}
      </p>
    </div>
  )
}

export function WatchItWork({ data, pageId, family }: { data: WatchData; pageId: string; family: string }) {
  const sceneId = 'none' in data ? null : watchSceneFor(pageId, family, data.control.name)
  const [loaded, setLoaded] = useState<HyperData | null>(null)
  const scene = loaded && loaded.id === sceneId ? loaded : null
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!sceneId) return
    let live = true
    loadScene<HyperData>(sceneId).then((d) => live && setLoaded(d), () => live && setFailed(true))
    return () => {
      live = false
    }
  }, [sceneId])

  return (
    <Slot name="watch_it_work" title="Watch it work">
      {'none' in data ? (
        <None />
      ) : sceneId && scene && !failed ? (
        <Sweep key={sceneId} data={data} scene={scene} />
      ) : sceneId && !failed ? (
        <div data-watch="loading" className="min-h-36 rounded-lg border border-border bg-surface-2" aria-hidden />
      ) : (
        <Placeholder data={data} />
      )}
    </Slot>
  )
}
