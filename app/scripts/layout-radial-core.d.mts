export type LayoutLevel = 'stage' | 'group' | 'family' | 'page'
export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface LayoutNode {
  id: string
  level: LayoutLevel
  /** Polar angle about the centre in degrees (0 = right, 90 = down, clockwise). */
  angle: number
  radius: number
  x: number
  y: number
  /** Which side of the dot the horizontal label sits on. */
  anchor: 'start' | 'end'
  /** Dot radius. */
  r: number
  /** Label box for the larger of the Names and Questions sets, padding and count room included. */
  w: number
  h: number
  /** Pages below this node (1 for a page). */
  count: number
  /** Stage only: no pages for this goal; draw dimmed with "Not used for this goal". */
  empty?: boolean
}
export interface LayoutFan { sector: number; children: LayoutNode[] }
export interface GoalLayout {
  /** The nine stage slots, in pipeline order. */
  ring: LayoutNode[]
  /** Children of each opened node, keyed by node id. */
  fans: Record<string, LayoutFan>
  /** Zoom-to-fit box of the ring plus the opened path, keyed by the opened node id (`root`: nothing open). */
  fits: Record<string, Rect>
}
export interface RadialLayout {
  version: number
  ring: number
  fanStep: number
  sectorMax: number
  metrics: typeof METRICS
  goals: Record<string, GoalLayout>
}
export interface ViewNode {
  id: string
  level: LayoutLevel
  names_label?: string | null
  question_label?: string | null
  shown_as?: string
  pick_when?: string
  children: ViewNode[]
}
export const RING: number
export const FAN_STEP: number
export const RADIUS_STEP: number
export const SECTOR_MAX: number
export const METRICS: {
  stage: { font: number; bold: boolean; wrap: number; dot: number }
  node: { font: number; bold: boolean; wrap: number; dot: number }
  page: { font: number; bold: boolean; wrap: number; dot: number }
  pick: { font: number; bold: boolean; wrap: number }
  note: { font: number; bold: boolean; text: string }
  boldEm: number
  regularEm: number
  lineHeight: number
  count: number
  gap: number
  padX: number
  padY: number
  margin: number
}
export function wrapText(text: string, maxChars: number): string[]
export function labelBoxes(node: ViewNode, empty?: boolean): { names: { w: number; h: number }; questions: { w: number; h: number } }
export function dotRadius(node: { level: string }): number
export function nodeRects(n: Pick<LayoutNode, 'x' | 'y' | 'r' | 'w' | 'h' | 'anchor'>): Rect[]
export function overlaps(a: Rect, b: Rect, margin?: number): boolean
export function fanSector(n: number): number
export function computeLayout(index: unknown): RadialLayout
