import { act, renderHook } from '@testing-library/react'
import { THEME_STORAGE_KEY, applyTheme, resetThemeCache, useTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  resetThemeCache()
})

test('defaults to system and leaves data-theme unset', () => {
  const { result } = renderHook(() => useTheme())
  expect(result.current.preference).toBe('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

test('an explicit choice sets data-theme and persists', () => {
  const { result } = renderHook(() => useTheme())
  act(() => result.current.setTheme('dark'))
  expect(result.current.preference).toBe('dark')
  expect(result.current.resolved).toBe('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
})

test('choosing system clears the override', () => {
  const { result } = renderHook(() => useTheme())
  act(() => result.current.setTheme('light'))
  act(() => result.current.setTheme('system'))
  expect(document.documentElement.dataset.theme).toBeUndefined()
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
})

test('a stored choice is read on first use', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'light')
  const { result } = renderHook(() => useTheme())
  expect(result.current.preference).toBe('light')
})

test('applyTheme works without storage', () => {
  applyTheme('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
})
