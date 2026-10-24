// Small record factory for tests. Only the fields the build code reads are meaningful.
import type { ItemRecord, PrepEntry, Rules, StageId } from '../content/types.ts'
import type { Pick } from './validate.ts'

export function rec(
  id: string,
  stage: StageId,
  family: string,
  o: { prep?: PrepEntry[]; rules?: Partial<Rules>; tracks?: ItemRecord['tracks'] } = {},
): Pick {
  return {
    record: {
      id,
      plain_name: id,
      code_name: id,
      aliases: [],
      stage,
      family,
      tracks: o.tracks ?? ['standard'],
      archetype: 'transformer',
      question_tags: [],
      targets: [],
      pairs_with: [],
      clashes: [],
      source_urls: [],
      library_versions: { 'scikit-learn': '1.9.1' },
      reviewed: false,
      rules: {
        task_types: [],
        blocked_when: [],
        fits_on_data: false,
        shape_effect: { rows: 'same', columns: 'same' },
        ...o.rules,
      },
      slots: {
        header: {},
        solves: { none: true },
        quick_facts: { none: true },
        use_avoid: { use_when: [], avoid_when: [] },
        prep: o.prep ?? [],
        code: [],
        what_comes_out: { none: true },
        catch_outs: [],
        key_settings: { tier1: [], tier2: [], tier3: [] },
        watch_it_work: { none: true },
        intuition: { none: true },
        next: [],
      },
    },
  }
}
