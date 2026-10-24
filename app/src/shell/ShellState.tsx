import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useIndex } from '@/content/load'
import type { TaskType, TrackId } from '@/content/types'

export type ViewId = 'tree' | 'constellation' | 'journey'
export type LabelMode = 'names' | 'questions'

interface ShellState {
  /** The goal id (`predict-number`, `predict-category`, `forecast`). Track and task come from it. */
  goal: string
  setGoal: (g: string) => void
  track: TrackId
  task: TaskType
  /** Names or Questions labels (spec 3.4). Default Questions, remembered in localStorage. */
  labels: LabelMode
  setLabels: (m: LabelMode) => void
  view: ViewId
  setView: (v: ViewId) => void
  /** Ask the tree to open the path to a node (stage, group, family or page) and bring it into view. */
  revealNode: (id: string) => void
  /** The latest `revealNode` request; `n` changes on every call so asking for the same node twice works. */
  reveal: { id: string; n: number } | null
}

const Ctx = createContext<ShellState | null>(null)

export const LABELS_KEY = 'mlfg.labels'
const DEFAULT_GOAL = 'predict-number'

function readLabels(): LabelMode {
  try {
    const v = window.localStorage.getItem(LABELS_KEY)
    if (v === 'names' || v === 'questions') return v
  } catch {
    // Storage can be blocked; the app works without it.
  }
  return 'questions'
}

/** Which goal filters the app (it sets the track and task), the label set, and which view is showing. */
export function ShellStateProvider({ children }: { children: ReactNode }) {
  const { data } = useIndex()
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [labels, setLabelsState] = useState<LabelMode>(readLabels)
  const [view, setView] = useState<ViewId>('tree')
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null)
  const revealNode = useCallback((id: string) => setReveal((r) => ({ id, n: (r?.n ?? 0) + 1 })), [])

  const setLabels = (m: LabelMode) => {
    setLabelsState(m)
    try {
      window.localStorage.setItem(LABELS_KEY, m)
    } catch {
      // Not remembered; fine.
    }
  }

  // A goal the content does not know falls back to the first one.
  const goals = data?.taxonomy?.goals
  const current = goals?.find((g) => g.id === goal) ?? goals?.[0]

  const value = useMemo<ShellState>(
    () => ({
      goal: current?.id ?? goal,
      setGoal,
      track: current?.track ?? 'standard',
      task: current?.task ?? 'regression',
      labels,
      setLabels,
      view,
      setView,
      revealNode,
      reveal,
    }),
    [goal, current, labels, view, revealNode, reveal],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShellState(): ShellState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useShellState needs ShellStateProvider')
  return v
}
