import type { ContentIndex } from './types'

type Labels = Pick<ContentIndex, 'taxonomy'> | null | undefined

/**
 * The text to show for a stage, group or family id (a taxonomy id such as `transform.encode.features`).
 * Names mode gives `names_label`; Questions mode gives `question_label` (for a per-goal map, the goal's
 * entry, else the first one). An id the taxonomy does not know comes back unchanged.
 */
export function nodeName(index: Labels, id: string, mode: 'names' | 'questions' = 'names', goal?: string): string {
  const entry = index?.taxonomy?.labels?.[id]
  if (!entry) return id
  if (mode === 'names') return entry.names_label
  const q = entry.question_label
  if (typeof q === 'string') return q
  return (goal ? q[goal] : null) ?? Object.values(q).find((v): v is string => typeof v === 'string') ?? entry.names_label
}

/** id to names_label for every stage, group and family; passed to the validator for its messages. */
export function familyNames(index: Labels): Record<string, string> {
  return Object.fromEntries(Object.entries(index?.taxonomy?.labels ?? {}).map(([id, l]) => [id, l.names_label]))
}
