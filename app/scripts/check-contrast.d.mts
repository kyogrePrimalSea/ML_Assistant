export interface ContrastResult {
  theme: 'light' | 'dark'
  label: string
  fg: string
  bg: string
  ratio: number
  min: number
  pass: boolean
}
export function parseTokens(css: string): { light: Record<string, string>; dark: Record<string, string> }
export function luminance(hex: string): number
export function contrastRatio(a: string, b: string): number
export function pairs(): [string, string, string, number][]
export function checkContrast(css: string): ContrastResult[]
