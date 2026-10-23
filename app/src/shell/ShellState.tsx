import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TrackId } from '@/content/types'

export type ViewId = 'tree' | 'constellation' | 'journey'

interface ShellState {
  track: TrackId
  setTrack: (t: TrackId) => void
  view: ViewId
  setView: (v: ViewId) => void
}

const Ctx = createContext<ShellState | null>(null)

/** Which track filters the catalogue, and which view is showing. Kept in memory for now. */
export function ShellStateProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<TrackId>('standard')
  const [view, setView] = useState<ViewId>('tree')
  return <Ctx.Provider value={{ track, setTrack, view, setView }}>{children}</Ctx.Provider>
}

export function useShellState(): ShellState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useShellState needs ShellStateProvider')
  return v
}
