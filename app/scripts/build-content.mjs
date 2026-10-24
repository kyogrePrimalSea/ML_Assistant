// Content build: reads ../content and writes static JSON to public/data.
//   index.json          vocab, pages (whole inventory + records), questions, relationships
//   pages/<id>.json     one content record + extraction facts for its key settings
// Fails loudly on any unreadable file. Does not re-validate the schema (Python does).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, cpSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { goalView, pagePlacement, sourceNodes } from './goal-view.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..', 'content')
const out = join(here, '..', 'public', 'data')

function fail(msg) {
  console.error(`build-content: ${msg}`)
  process.exit(1)
}

function readYaml(path) {
  try {
    return yamlLoad(readFileSync(path, 'utf8'))
  } catch (e) {
    return fail(`cannot parse ${path}: ${e.message}`)
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return fail(`cannot parse ${path}: ${e.message}`)
  }
}

function listFiles(dir, ext) {
  if (!existsSync(dir)) return []
  const found = []
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name)
    if (e.isDirectory()) found.push(...listFiles(p, ext))
    else if (e.name.endsWith(ext)) found.push(p)
  }
  return found
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])]),
    )
  }
  return v
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(sortKeys(data), null, 2) + '\n')
}

const uniq = (xs) => [...new Set(xs)]

// Inputs
const vocab = readYaml(join(root, 'schema', 'vocab.yaml'))
const relationships = readJson(join(root, 'derived', 'relationships.json'))
const tax = readYaml(join(root, 'taxonomy.yaml'))
const placement = pagePlacement(tax)
const placed = (id) => placement.get(id) ?? fail(`page ${id} is not in content/taxonomy.yaml`)

const inventory = []
for (const f of ['catalogue.yaml', 'supporting.yaml']) {
  const doc = readYaml(join(root, 'inventory', f))
  if (!doc || !Array.isArray(doc.items)) fail(`${f} has no items list`)
  inventory.push(...doc.items)
}

const records = new Map()
for (const f of listFiles(join(root, 'items'), '.yaml')) {
  const rec = readYaml(f)
  if (!rec || typeof rec.id !== 'string') fail(`${f} has no id`)
  if (records.has(rec.id)) fail(`duplicate record id ${rec.id}`)
  records.set(rec.id, rec)
}

const questions = []
for (const f of listFiles(join(root, 'questions'), '.yaml')) {
  const doc = readYaml(f)
  if (!doc || !Array.isArray(doc.questions)) fail(`${f} has no questions list`)
  questions.push(...doc.questions)
}
questions.sort((a, b) => a.id.localeCompare(b.id))

const extraction = new Map() // inventory id -> record
for (const f of listFiles(join(root, 'extraction'), '.json')) {
  if (f.includes(`${join(root, 'extraction', 'verification')}`)) continue
  const rec = readJson(f)
  if (rec && typeof rec.id === 'string') extraction.set(rec.id, rec)
}

// Group inventory entries by page id.
const byPage = new Map()
for (const e of inventory) {
  if (!byPage.has(e.page)) byPage.set(e.page, [])
  byPage.get(e.page).push(e)
}

const pages = []
for (const [id, entries] of byPage) {
  const rec = records.get(id)
  const first = entries[0]
  pages.push({
    id,
    plain_name: rec ? rec.plain_name : uniq(entries.map((e) => e.name)).join(' / '),
    code_name: rec ? rec.code_name : uniq(entries.map((e) => e.name)).join(' / '),
    ...(rec?.aliases?.length ? { aliases: rec.aliases } : {}),
    stage: placed(id).stage,
    family: placed(id).family,
    archetype: first.archetype,
    tracks: uniq(entries.flatMap((e) => e.tracks || [])).sort(),
    targets: entries.map((e) => e.id).sort(),
    libraries: uniq(entries.map((e) => e.library)).sort(),
    has_record: Boolean(rec),
    reviewed: rec ? Boolean(rec.reviewed) : false,
  })
}
// Records with no inventory entry (hyperparameter and output pages).
for (const [id, rec] of records) {
  if (byPage.has(id)) continue
  pages.push({
    id,
    plain_name: rec.plain_name,
    code_name: rec.code_name,
    ...(rec.aliases?.length ? { aliases: rec.aliases } : {}),
    stage: placed(id).stage,
    family: placed(id).family,
    archetype: rec.archetype,
    tracks: [...rec.tracks].sort(),
    targets: [...(rec.targets || [])].sort(),
    libraries: uniq(Object.keys(rec.library_versions || {})).sort(),
    has_record: true,
    reviewed: Boolean(rec.reviewed),
    ...(rec.applies_to ? { applies_to: rec.applies_to } : {}),
  })
}
pages.sort((a, b) => a.id.localeCompare(b.id))

// Extraction facts for key settings.
function facts(param) {
  return { allowed: param.allowed, default: param.default, effective_default: param.effective_default }
}

function keySettingFacts(rec) {
  const result = {}
  const names = []
  for (const tier of ['tier1', 'tier2', 'tier3']) {
    for (const ks of rec.slots.key_settings[tier] || []) names.push(ks.name)
  }
  const targets = (rec.targets || []).map((t) => [t, extraction.get(t)]).filter(([, x]) => x)
  for (const name of names) {
    const per = {}
    for (const [t, x] of targets) {
      const p = x.parameters.find((q) => q.name === name)
      if (p) per[t] = facts(p)
    }
    const ts = Object.keys(per).sort()
    if (ts.length === 0) continue
    const same = ts.every((t) => JSON.stringify(sortKeys(per[t])) === JSON.stringify(sortKeys(per[ts[0]])))
    result[name] = same ? { ...per[ts[0]] } : { by_target: Object.fromEntries(ts.map((t) => [t, per[t]])) }
  }
  return result
}

// Write outputs.
rmSync(join(out, 'pages'), { recursive: true, force: true })
for (const [id, rec] of records) {
  write(join(out, 'pages', `${id}.json`), { id, record: rec, key_setting_facts: keySettingFacts(rec) })
}

// Cutscene data is copied as-is (illustrative numbers, generated by tools/).
rmSync(join(out, 'cutscenes'), { recursive: true, force: true })
if (existsSync(join(root, 'cutscenes'))) cpSync(join(root, 'cutscenes'), join(out, 'cutscenes'), { recursive: true })

// Taxonomy for the app: goals, root prompts, one resolved and elided view per goal, and a label
// table for every stage, group and family id (source values: a string or a per-goal map).
const withPageTexts = (n) =>
  n.level === 'page'
    ? { ...n, names_label: n.shown_as, question_label: n.shown_as, question_sentence: null, question_prompt: null }
    : { ...n, children: n.children.map(withPageTexts) }
const taxonomy = {
  root: tax.root,
  goal_prompt: tax.goal_prompt,
  goals: tax.goals,
  views: Object.fromEntries(tax.goals.map((g) => [g.id, goalView(tax, g.id).map(withPageTexts)])),
  labels: Object.fromEntries(
    sourceNodes(tax).map(([n]) => [n.id, { names_label: n.names_label, question_label: n.question_label }]),
  ),
}

write(join(out, 'index.json'), { pages, questions, relationships, vocab, taxonomy })

console.log(
  `build-content: ${pages.length} pages (${records.size} with records), ${questions.length} questions, ${relationships.length} relationships`,
)
