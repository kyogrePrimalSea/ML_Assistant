import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { clearContentCache, loadIndex, loadPage, useIndex, usePage } from './load'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

beforeEach(() => clearContentCache())
afterEach(() => vi.unstubAllGlobals())

describe('loaders', () => {
  it('fetches from BASE_URL and caches', async () => {
    const f = vi.fn().mockResolvedValue(ok({ pages: [] }))
    vi.stubGlobal('fetch', f)
    await loadIndex()
    await loadIndex()
    expect(f).toHaveBeenCalledTimes(1)
    expect(f).toHaveBeenCalledWith(import.meta.env.BASE_URL + 'data/index.json')
  })

  it('loads a page by id', async () => {
    const f = vi.fn().mockResolvedValue(ok({ id: 'xgboost' }))
    vi.stubGlobal('fetch', f)
    expect((await loadPage('xgboost')).id).toBe('xgboost')
    expect(f).toHaveBeenCalledWith(import.meta.env.BASE_URL + 'data/pages/xgboost.json')
  })

  it('rejects on HTTP error and does not cache the failure', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce(ok({ id: 'a' }))
    vi.stubGlobal('fetch', f)
    await expect(loadPage('a')).rejects.toThrow('404')
    expect((await loadPage('a')).id).toBe('a')
  })
})

describe('hooks', () => {
  it('useIndex goes from loading to data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ pages: [1] })))
    const { result } = renderHook(() => useIndex())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ pages: [1] })
    expect(result.current.error).toBeNull()
  })

  it('usePage reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))
    const { result } = renderHook(() => usePage('zzz'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toContain('500')
    expect(result.current.data).toBeNull()
  })
})
