import { useCallback, useEffect, useRef, useState } from 'react'
import { IconReload } from '@tabler/icons-react'
import type { Hero } from '@/content/types'
import { useMediaQuery } from '@/shell/useMediaQuery'
import { BoostingFit, type BoostingData } from './scenes/BoostingFit'
import { sceneFor, type SceneId } from './types'

const DESCRIPTIONS: Record<SceneId, string> = {
  'boosting-fit':
    'Dots show house size against price. A step-shaped line starts flat at the average price, then bends toward the dots as each of five trees is added, ending close to the trend.',
}

const cache = new Map<SceneId, Promise<BoostingData>>()
function loadScene(id: SceneId): Promise<BoostingData> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/cutscenes/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`cutscene ${id}: ${r.status}`)
      return r.json() as Promise<BoostingData>
    })
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}
export const clearCutsceneCache = () => cache.clear()

/**
 * Plays the hero's scene once when it first scrolls into view, with a replay button.
 * Reduced motion: the final frame, no motion. Returns null when the hero has no scene or fails to load,
 * so the caller can keep its placeholder.
 */
export function CutscenePlayer({ hero, family, fallback }: { hero: Hero; family: string; fallback: React.ReactNode }) {
  const sceneId = sceneFor(hero, family)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', false)
  const [data, setData] = useState<BoostingData | null>(null)
  const [failed, setFailed] = useState(false)
  const [run, setRun] = useState(1)
  const [state, setState] = useState<'playing' | 'done'>(reduced ? 'done' : 'playing')
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneId) return
    let live = true
    loadScene(sceneId).then((d) => live && setData(d), () => live && setFailed(true))
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
      <BoostingFit data={data} reduced={reduced} run={run} visible={visible} onState={onState} />
      <figcaption className="sr-only">{DESCRIPTIONS[sceneId]}</figcaption>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        disabled={state === 'playing' && !reduced}
        className="absolute bottom-2 right-2 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface-1 px-2.5 text-sm text-text hover:border-accent disabled:opacity-50"
      >
        <IconReload className="size-4" aria-hidden />
        Replay
      </button>
    </figure>
  )
}
