import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'mlfg-theme'

const listeners = new Set<() => void>()

function isPreference(v: unknown): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system'
}

export function readStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (isPreference(v)) return v
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  return 'system'
}

function writeStoredTheme(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
}

/** Explicit choice sets data-theme; "system" removes it so CSS follows prefers-color-scheme. */
export function applyTheme(pref: ThemePreference, root: HTMLElement = document.documentElement) {
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
}

let current: ThemePreference | null = null

function getPreference(): ThemePreference {
  if (current === null) current = readStoredTheme()
  return current
}

export function setTheme(pref: ThemePreference) {
  current = pref
  writeStoredTheme(pref)
  applyTheme(pref)
  listeners.forEach((l) => l())
}

function subscribePreference(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function systemQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

function subscribeSystem(listener: () => void) {
  const mq = systemQuery()
  mq?.addEventListener('change', listener)
  return () => mq?.removeEventListener('change', listener)
}

const systemPrefersDark = () => systemQuery()?.matches ?? false

export function useTheme() {
  const preference = useSyncExternalStore(subscribePreference, getPreference, () => 'system' as const)
  const systemDark = useSyncExternalStore(subscribeSystem, systemPrefersDark, () => false)
  const resolved: ResolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  return { preference, resolved, setTheme }
}

/** Test helper: forget the cached preference so the next read hits storage again. */
export function resetThemeCache() {
  current = null
}
