// @vitest-environment node
/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ContentIndex, PageData } from './types'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const data = join(appDir, 'public', 'data')
// Source counts come from the content folder, so adding records never breaks these tests.
const contentDir = join(appDir, '..', 'content')
const recordCount = (readdirSync(join(contentDir, 'items'), { recursive: true }) as string[]).filter((f) => f.endsWith('.yaml')).length
const read = <T,>(p: string) => JSON.parse(readFileSync(join(data, p), 'utf8')) as T

let index: ContentIndex

beforeAll(() => {
  execFileSync('node', ['scripts/build-content.mjs'], { cwd: appDir, stdio: 'pipe' })
  index = read<ContentIndex>('index.json')
})

describe('build-content output', () => {
  it('has one indexed record per content file, and the questions', () => {
    expect(recordCount).toBeGreaterThan(0)
    expect(index.pages.filter((p) => p.has_record)).toHaveLength(recordCount)
    expect(index.questions.length).toBeGreaterThan(0)
  })

  it('indexes every inventory page', () => {
    expect(index.pages.length).toBeGreaterThan(300)
    const ids = index.pages.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)))
  })

  it('includes vocab and relationships', () => {
    expect(index.vocab.stages[0].id).toBe('explore')
    expect(index.relationships.length).toBeGreaterThan(0)
  })

  it('writes page JSON exactly for the pages with records', () => {
    const page = read<PageData>('pages/xgboost.json')
    expect(page.record.id).toBe('xgboost')
    const files = new Set(readdirSync(join(data, 'pages')).map((f) => f.replace(/\.json$/, '')))
    expect(index.pages.filter((p) => p.has_record).map((p) => p.id).sort()).toEqual([...files].sort())
  })

  it('attaches XGBoost key-setting defaults, max_depth effective default 6', () => {
    const page = read<PageData>('pages/xgboost.json')
    const md = page.key_setting_facts.max_depth
    expect(md).toMatchObject({ default: 'None', effective_default: '6' })
    expect(page.key_setting_facts.learning_rate).toBeDefined()
  })

  it('is deterministic', () => {
    const before = readFileSync(join(data, 'index.json'), 'utf8')
    execFileSync('node', ['scripts/build-content.mjs'], { cwd: appDir, stdio: 'pipe' })
    expect(readFileSync(join(data, 'index.json'), 'utf8')).toBe(before)
  })
})
