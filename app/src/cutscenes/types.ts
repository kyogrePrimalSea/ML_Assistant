import type { Hero } from '@/content/types'

/** Props every scene receives from the player. */
export interface SceneProps {
  /** Skip the motion and show the final frame. */
  reduced: boolean
  /** Bumps on each replay; also the first play. */
  run: number
  /** False while the player is scrolled off-screen: the scene pauses. */
  visible: boolean
  /** Reports 'playing' or 'done' so the player can label state and enable replay. */
  onState: (s: 'playing' | 'done') => void
}

export type SceneId = 'boosting-fit'

/** Which scene (if any) a hero spec has; boosting families only for the boosting scene. Others keep the placeholder. */
export function sceneFor(hero: Hero, family: string): SceneId | null {
  if (hero.kind === 'model' && hero.shape === 'fit_line' && family.startsWith('Boosting')) return 'boosting-fit'
  return null
}
