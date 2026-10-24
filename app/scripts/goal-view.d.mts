import type { ViewNode } from './layout-radial-core.mjs'
export function nodeText(value: unknown, goalId: string): string | null
export function goalView(taxonomy: unknown, goalId: string): ViewNode[]
export function sourceNodes(taxonomy: unknown): [{ id: string }, string][]
export function pagePlacement(taxonomy: unknown): Map<string, { stage: string; family: string; goals: string[] }>
