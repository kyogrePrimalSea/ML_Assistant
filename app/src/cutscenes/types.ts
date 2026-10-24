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

/** Taxonomy id of the boosting family (content/taxonomy.yaml); record families are taxonomy ids since T035. */
export const BOOSTING_FAMILY = 'model.trees.boosting'
export const HYPER_PAGES = ['n-estimators', 'max-depth', 'learning-rate', 'early-stopping'] as const
export type SceneId = 'boosting-fit' | `hyper-${(typeof HYPER_PAGES)[number]}`

const isHyperPage = (id: string | undefined): id is (typeof HYPER_PAGES)[number] =>
  !!id && (HYPER_PAGES as readonly string[]).includes(id)

/**
 * Which hero scene (if any) a page has. Boosting families get the boosting scene; the four hyperparameter pages
 * get their own sweep scene. Others keep the placeholder.
 */
export function sceneFor(hero: Hero, family: string, pageId?: string): SceneId | null {
  if (hero.kind === 'model' && hero.shape === 'fit_line' && family === BOOSTING_FAMILY) return 'boosting-fit'
  if (hero.kind === 'hyperparameter' && isHyperPage(pageId)) return `hyper-${pageId}`
  return null
}

/**
 * Which data file drives a page's Watch it work slider. The hyperparameter pages use their own; the boosting
 * model pages reuse the n_estimators sweep when their control is the round count.
 */
export function watchSceneFor(pageId: string, family: string, controlName: string): SceneId | null {
  if (isHyperPage(pageId)) return `hyper-${pageId}`
  if (family === BOOSTING_FAMILY && (controlName === 'n_estimators' || controlName === 'max_iter')) return 'hyper-n-estimators'
  return null
}
