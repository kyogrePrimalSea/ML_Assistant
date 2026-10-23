export interface LayoutItem { id: string; x: number; y: number }
export interface LayoutFamily { name: string; x: number; y: number; count: number; items: LayoutItem[] }
export interface LayoutStage {
  id: string
  angle: number
  x: number
  y: number
  side: 1 | -1
  count: number
  families: LayoutFamily[]
}
export interface RadialLayout {
  version: number
  ring: number
  familyX: number
  itemX: number
  spine: number
  gap: number
  tracks: Record<string, LayoutStage[]>
}
export const RING: number
export const FAMILY_X: number
export const ITEM_X: number
export const SPINE: number
export const GAP: number
export function computeLayout(index: unknown): RadialLayout
