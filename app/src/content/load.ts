import { useEffect, useState } from 'react'
import type { ContentIndex, Loaded, PageData } from './types'

const base = () => import.meta.env.BASE_URL + 'data/'

let indexPromise: Promise<ContentIndex> | null = null
const pagePromises = new Map<string, Promise<PageData>>()

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`)
  return (await res.json()) as T
}

export function loadIndex(): Promise<ContentIndex> {
  if (!indexPromise) {
    indexPromise = fetchJson<ContentIndex>(base() + 'index.json').catch((e) => {
      indexPromise = null
      throw e
    })
  }
  return indexPromise
}

export function loadPage(id: string): Promise<PageData> {
  let p = pagePromises.get(id)
  if (!p) {
    p = fetchJson<PageData>(`${base()}pages/${encodeURIComponent(id)}.json`).catch((e) => {
      pagePromises.delete(id)
      throw e
    })
    pagePromises.set(id, p)
  }
  return p
}

/** Test helper: forget cached results. */
export function clearContentCache() {
  indexPromise = null
  pagePromises.clear()
}

function useLoaded<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: Error | null }>({
    key: null,
    data: null,
    error: null,
  })
  useEffect(() => {
    if (key === null) return
    let live = true
    load().then(
      (data) => live && setState({ key, data, error: null }),
      (error: Error) => live && setState({ key, data: null, error }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const ready = state.key === key
  return {
    data: ready ? state.data : null,
    error: ready ? state.error : null,
    loading: key !== null && !ready,
  }
}

export function useIndex(): Loaded<ContentIndex> {
  return useLoaded('index', loadIndex)
}

export function usePage(id: string | undefined): Loaded<PageData> {
  return useLoaded(id ?? null, () => loadPage(id as string))
}
