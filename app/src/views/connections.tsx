import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { RelationshipType } from '@/content/types'

interface ConnectionsState {
  /** Relationship types whose lines are drawn for the selected item. Empty by default (never clutter). */
  on: ReadonlySet<RelationshipType>
  toggle: (t: RelationshipType) => void
  /** False when the current view cannot draw lines. */
  canDraw: boolean
}

const Ctx = createContext<ConnectionsState | null>(null)

/** Which connection types are shown. Kept in memory, shared by the panel's toggles and the tree. */
export function ConnectionsProvider({ canDraw, children }: { canDraw: boolean; children: ReactNode }) {
  const state = useLocalState(canDraw)
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

function useLocalState(canDraw: boolean): ConnectionsState {
  const [on, setOn] = useState<ReadonlySet<RelationshipType>>(new Set())
  return useMemo(
    () => ({
      on,
      canDraw,
      toggle: (t) =>
        setOn((cur) => {
          const next = new Set(cur)
          if (!next.delete(t)) next.add(t)
          return next
        }),
    }),
    [on, canDraw],
  )
}

/** Works without a provider (a panel rendered on its own keeps its own toggles). */
export function useConnections(): ConnectionsState {
  const shared = useContext(Ctx)
  const local = useLocalState(false)
  return shared ?? local
}
