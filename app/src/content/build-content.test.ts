// @vitest-environment node
/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
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

// The pretest hook has just run build-content. Re-running it here would wipe public/data while
// other test files read it in parallel.
beforeAll(() => {
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

  it('transports XGBoost rich learning fields unchanged', () => {
    const page = read<PageData>('pages/xgboost.json')
    expect(page.record.slots.code[0].output).toContain('y_pred: 18.2')
    const whatComesOut = page.record.slots.what_comes_out
    expect('items' in whatComesOut && whatComesOut.output).toContain('classification y_proba')
    expect(page.record.slots.key_settings.tier1[0].controls).toContain('boosting rounds')
    const intuition = page.record.slots.intuition
    expect('idea' in intuition && intuition.math?.equations).toHaveLength(7)
  })

  it('is deterministic', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'build-content-'))
    execFileSync('node', ['scripts/build-content.mjs'], { cwd: appDir, stdio: 'pipe', env: { ...process.env, BUILD_CONTENT_OUT: tmp } })
    expect(readFileSync(join(tmp, 'index.json'), 'utf8')).toBe(readFileSync(join(data, 'index.json'), 'utf8'))
    rmSync(tmp, { recursive: true, force: true })
  }, 60_000)
})
