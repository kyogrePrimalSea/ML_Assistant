// JS mirror of tools/taxonomy.py (goal_view, node_text, page_placement). Algorithm: docs/CONTENT_SCHEMA.md
// "Goal views". app/src/content/goal-view.test.ts compares it with a fixture exported from Python.

const TEXT_KEYS = ['names_label', 'question_label', 'question_sentence', 'question_prompt']

/** A node's text for a goal: the string itself, or the map entry for that goal (null if absent). */
export function nodeText(value, goalId) {
  if (value !== null && typeof value === 'object') return value[goalId] ?? null
  return value ?? null
}

const childrenOf = (node) => (node.children !== undefined ? node.children : (node.pages ?? []))

function build(node, goalId, level) {
  if (level === 'page') {
    if (!node.for.includes(goalId)) return null
    return { id: node.id, level: 'page', shown_as: node.shown_as, pick_when: node.pick_when, children: [] }
  }
  const kids = []
  for (const ch of childrenOf(node)) {
    const built = build(ch, goalId, ch.level ?? 'page')
    if (built !== null) kids.push(built)
  }
  if (kids.length === 0 && level !== 'stage') return null
  const out = { id: node.id, level, children: kids }
  for (const key of TEXT_KEYS) if (key in node) out[key] = nodeText(node[key], goalId)
  return out
}

/** One bottom-up pass of the no-single-child rule. Returns true when anything changed. */
function elide(node) {
  let changed = false
  for (const ch of node.children) changed = elide(ch) || changed
  node.children = node.children.map((ch) => {
    if ((ch.level === 'group' || ch.level === 'family') && ch.children.length === 1 && ch.children[0].level === 'page') {
      changed = true
      return ch.children[0]
    }
    return ch
  })
  if ((node.level === 'stage' || node.level === 'group') && node.children.length === 1 && ['group', 'family'].includes(node.children[0].level)) {
    node.children = node.children[0].children
    changed = true
  }
  return changed
}

/** The nine stage nodes of one goal after filtering and elision. */
export function goalView(taxonomy, goalId) {
  const stages = taxonomy.stages.map((s) => build(s, goalId, 'stage'))
  for (const st of stages) while (elide(st));
  return stages
}

/** Every stage, group and family of the source taxonomy: [node, stageId]. */
export function sourceNodes(taxonomy) {
  const out = []
  const rec = (n, stage) => {
    out.push([n, stage])
    for (const ch of n.children ?? []) rec(ch, stage)
  }
  for (const s of taxonomy.stages) rec(s, s.id)
  return out
}

/** Map of page id to {stage, family (the owning family or group id), goals}. */
export function pagePlacement(taxonomy) {
  const out = new Map()
  for (const [n, stage] of sourceNodes(taxonomy)) {
    for (const p of n.pages ?? []) if (!out.has(p.id)) out.set(p.id, { stage, family: n.id, goals: [...p.for] })
  }
  return out
}
