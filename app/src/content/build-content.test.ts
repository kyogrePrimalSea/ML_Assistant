// @vitest-environment node
/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ContentIndex, PageData } from './types'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const data = join(appDir, 'public', 'data')
const read = <T,>(p: string) => JSON.parse(readFileSync(join(data, p), 'utf8')) as T

let index: ContentIndex

beforeAll(() => {
  execFileSync('node', ['scripts/build-content.mjs'], { cwd: appDir, stdio: 'pipe' })
  index = read<ContentIndex>('index.json')
})

describe('build-content output', () => {
  it('has 11 records and 3 questions', () => {
    expect(index.pages.filter((p) => p.has_record)).toHaveLength(11)
    expect(index.questions).toHaveLength(3)
  })

  it('indexes every inventory page, with or without a record', () => {
    expect(index.pages.length).toBeGreaterThan(300)
    expect(index.pages.some((p) => !p.has_record)).toBe(true)
    const ids = index.pages.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)))
  })

  it('includes vocab and relationships', () => {
    expect(index.vocab.stages[0].id).toBe('explore')
    expect(index.relationships.length).toBeGreaterThan(0)
  })

  it('writes page JSON only for records', () => {
    const page = read<PageData>('pages/xgboost.json')
    expect(page.record.id).toBe('xgboost')
    expect(() => read('pages/ridge.json')).toThrow()
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
