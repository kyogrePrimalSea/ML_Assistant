import { createContext, useContext } from 'react'
import { nodeName } from '@/content/labels'
import type { ContentIndex } from '@/content/types'

/** The catalogue index, shared by all slots so they can turn ids into names and links. Null while loading or failed. */
export const IndexContext = createContext<ContentIndex | null>(null)

export function useCatalogue() {
  const index = useContext(IndexContext)
  return {
    index,
    pageName: (id: string) => index?.pages.find((p) => p.id === id)?.plain_name ?? id,
    /** Display name of a taxonomy family or group id. */
    nodeName: (id: string) => nodeName(index, id),
    questionText: (id: string) => index?.questions.find((q) => q.id === id)?.text ?? id,
    datasetName: (id: string) => index?.vocab.toy_datasets?.find((d) => d.id === id)?.name ?? id,
    archetypeName: (id: string) => index?.vocab.archetypes?.find((a) => a.id === id)?.name ?? id,
    /** Family step: the first written page of that taxonomy family, else the first listed, else none. */
    familyPage: (family: string) => {
      const hits = index?.pages.filter((p) => p.family === family) ?? []
      return (hits.find((p) => p.has_record) ?? hits[0])?.id ?? null
    },
  }
}
