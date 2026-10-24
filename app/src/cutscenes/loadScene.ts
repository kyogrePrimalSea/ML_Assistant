import type { SceneId } from './types'

const cache = new Map<SceneId, Promise<unknown>>()

/** Fetches a cutscene data file once; a failed fetch is forgotten so a later try can succeed. */
export function loadScene<T>(id: SceneId): Promise<T> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/cutscenes/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`cutscene ${id}: ${r.status}`)
      return r.json() as Promise<unknown>
    })
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p as Promise<T>
}
export const clearCutsceneCache = () => cache.clear()
