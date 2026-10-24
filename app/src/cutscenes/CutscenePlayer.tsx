import { useCallback, useEffect, useRef, useState } from 'react'
import { IconReload } from '@tabler/icons-react'
import type { Hero } from '@/content/types'
import { useMediaQuery } from '@/shell/useMediaQuery'
import { BoostingFit, type BoostingData } from './scenes/BoostingFit'
import { HyperHero, type HyperData } from './scenes/Hyperparameter'
import { clearCutsceneCache, loadScene } from './loadScene'
import { sceneFor, type SceneId } from './types'

const HYPER_DESCRIPTION =
  'Two panels. The left shows house size against price with the model fit line changing as the setting steps through its values. The right plots training and validation error against the setting, with underfit values to the left of the sweet spot and overfit values to the right.'
const DESCRIPTIONS: Record<SceneId, string> = {
  'boosting-fit':
    'Dots show house size against price. A step-shaped line starts flat at the average price, then bends toward the dots as each of five trees is added, ending close to the trend.',
  'hyper-n-estimators': HYPER_DESCRIPTION,
  'hyper-max-depth': HYPER_DESCRIPTION,
  'hyper-learning-rate': HYPER_DESCRIPTION,
  'hyper-early-stopping': HYPER_DESCRIPTION,
}

export { clearCutsceneCache }

/**
 * Plays the hero's scene once when it first scrolls into view, with a replay button.
 * Reduced motion: the final frame, no motion. Returns null when the hero has no scene or fails to load,
 * so the caller can keep its placeholder.
 */
export function CutscenePlayer({ hero, family, pageId, fallback }: { hero: Hero; family: string; pageId?: string; fallback: React.ReactNode }) {
  const sceneId = sceneFor(hero, family, pageId)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', false)
  const [data, setData] = useState<BoostingData | HyperData | null>(null)
  const [failed, setFailed] = useState(false)
  const [run, setRun] = useState(1)
  const [state, setState] = useState<'playing' | 'done'>(reduced ? 'done' : 'playing')
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneId) return
    let live = true
    loadScene<BoostingData | HyperData>(sceneId).then((d) => live && setData(d), () => live && setFailed(true))
    return () => {
      live = false
    }
  }, [sceneId])

  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  const onState = useCallback((s: 'playing' | 'done') => setState(s), [])

  if (!sceneId || failed) return <>{fallback}</>
  if (!data) return <div data-cutscene="loading" className="min-h-36 rounded-lg border border-border bg-surface-2" aria-hidden />

  return (
    <figure ref={box} data-cutscene={sceneId} data-state={state} className="relative m-0 rounded-lg border border-border bg-surface-2 p-3">
      {hero.kind === 'hyperparameter' ? (
        <HyperHero data={data as HyperData} sweep={hero.sweep} reduced={reduced} run={run} visible={visible} onState={onState} />
      ) : (
        <BoostingFit data={data as BoostingData} reduced={reduced} run={run} visible={visible} onState={onState} />
      )}
      <figcaption className="sr-only">{DESCRIPTIONS[sceneId]}</figcaption>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        disabled={state === 'playing' && !reduced}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface-1 px-2.5 text-sm text-text hover:border-accent disabled:opacity-50 ${
          hero.kind === 'hyperparameter' ? 'mt-2 ml-auto flex w-fit' : 'absolute bottom-2 right-2'
        }`}
      >
        <IconReload className="size-4" aria-hidden />
        Replay
      </button>
    </figure>
  )
}
