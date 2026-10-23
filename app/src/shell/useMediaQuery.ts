import { useSyncExternalStore } from 'react'

/** Live match of a CSS media query. Falls back to `fallback` where matchMedia is missing (tests). */
export function useMediaQuery(query: string, fallback = true): boolean {
  const subscribe = (cb: () => void) => {
    if (typeof window.matchMedia !== 'function') return () => {}
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
  const get = () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback)
  return useSyncExternalStore(subscribe, get, () => fallback)
}
