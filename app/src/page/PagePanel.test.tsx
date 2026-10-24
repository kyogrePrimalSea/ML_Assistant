import { readdirSync, readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { clearContentCache } from '@/content/load'
import { PagePanel } from './PagePanel'
import { conditionTags } from './slots/Prep'
import { defaultText } from './slots/KeySettings'

const dir = 'public/data/'
const ids = readdirSync(dir + 'pages').map((f) => f.replace('.json', ''))

beforeEach(() => {
  clearContentCache()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = url.split('data/')[1]
      try {
        return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(dir + path, 'utf8')) }
      } catch {
        return { ok: false, status: 404, json: async () => ({}) }
      }
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

const show = (id: string) =>
  render(
    <MemoryRouter>
      <PagePanel id={id} />
    </MemoryRouter>,
  )

const ORDER = [
  'header', 'solves', 'quick_facts', 'use_avoid', 'prep', 'code', 'what_comes_out',
  'catch_outs', 'key_settings', 'watch_it_work', 'intuition', 'next',
]

test('every record has a built page file', () => expect(ids.length).toBeGreaterThan(0))

test.each(ids)('%s renders all 12 slots in order, each with a heading', async (id) => {
  const { container } = show(id)
  await screen.findByRole('article')
  const sections = [...container.querySelectorAll('section[data-slot-name]')]
  expect(sections.map((s) => s.getAttribute('data-slot-name'))).toEqual(ORDER)
  for (const s of sections) expect(within(s as HTMLElement).getAllByRole('heading').length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: 'Intuition' })).toBeInTheDocument()
})

test('empty slots say None', async () => {
  show('max-depth')
  await screen.findByRole('article')
  const prep = document.querySelector('[data-slot-name="prep"]') as HTMLElement
  expect(within(prep).getByText('None')).toBeInTheDocument()
  const ks = document.querySelector('[data-slot-name="key_settings"]') as HTMLElement
  expect(within(ks).getByText('None')).toBeInTheDocument()
})

test('XGBoost: header, prep rows (spec 5.4) and max_depth effective default', async () => {
  show('xgboost')
  await screen.findByRole('article')
  expect(screen.getByRole('heading', { level: 2, name: 'XGBoost' })).toBeInTheDocument()
  expect(screen.getByText('Draft')).toBeInTheDocument()

  const rows = [...document.querySelectorAll('[data-prep-status]')]
  expect(rows.map((r) => r.getAttribute('data-prep-status'))).toEqual([
    'not_needed', 'not_needed', 'required', 'recommended', 'recommended',
  ])
  const encoding = rows[2] as HTMLElement
  expect(encoding).toHaveTextContent('Categorical encoding')
  expect(encoding).toHaveTextContent('Required')
  expect(encoding).toHaveTextContent('if: has categoricals')
  expect(encoding).toHaveTextContent('unless enable_categorical=True')
  expect(rows[0]).toHaveTextContent('Not needed')
  expect(rows[4].querySelector('a')).toHaveAttribute('href', '/page/train-test-split')

  const ks = document.querySelector('[data-slot-name="key_settings"]') as HTMLElement
  const maxDepth = within(ks).getByRole('link', { name: 'max_depth' })
  expect(maxDepth).toHaveAttribute('href', '/page/max-depth')
  expect(maxDepth.closest('li')).toHaveTextContent('set as None in the signature')
  expect(maxDepth.closest('li')).toHaveTextContent('6')
  expect(maxDepth.closest('li')).not.toHaveTextContent('→')
  expect(maxDepth.closest('li')).not.toHaveTextContent('effective default')
})

test('tiers 2 and 3 are hidden until opened; intuition is collapsed', async () => {
  const user = userEvent.setup()
  show('xgboost')
  await screen.findByRole('article')
  expect(screen.queryByText('subsample')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Also useful/ }))
  expect(screen.getByText('subsample')).toBeInTheDocument()
  expect(screen.queryByText('reg_lambda')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Rarely changed/ }))
  expect(screen.getByText('reg_lambda')).toBeInTheDocument()
  expect(screen.getByText('Most used')).toBeInTheDocument()
  expect(screen.queryByText(/Tier \d|More settings/)).not.toBeInTheDocument()

  expect(screen.queryByText('The one idea')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Intuition' }))
  expect(screen.getByText('The one idea')).toBeInTheDocument()
  expect(screen.queryByText('Start with a constant prediction.')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Read more' }))
  expect(screen.getByText('Start with a constant prediction.')).toBeInTheDocument()
})

test('next shows question text linking to the question route', async () => {
  show('xgboost')
  await screen.findByRole('article')
  const next = document.querySelector('[data-slot-name="next"]') as HTMLElement
  for (const a of within(next).getAllByRole('link')) expect(a.getAttribute('href')).toMatch(/^\/question\//)
})

test('unknown id shows a friendly not-found', async () => {
  show('no-such-page')
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
})

test('a catalogue page without a record says not written yet', async () => {
  const idx = JSON.parse(readFileSync(dir + 'index.json', 'utf8'))
  const missing = idx.pages.find((p: { has_record: boolean }) => !p.has_record)
  show(missing.id)
  expect(await screen.findByText('This page is not written yet.')).toBeInTheDocument()
})

test('helpers', () => {
  expect(conditionTags({ imbalanced: true, task_type: ['classification'] })).toEqual([
    'task: classification', 'if: imbalanced',
  ])
  expect(conditionTags(null)).toEqual([])
  const f = (d: string | null, e: string | null) => ({
    allowed: { source: 'none' as const, options: [], intervals: [], types: [] },
    default: d,
    effective_default: e,
  })
  expect(defaultText(f(null, '6'))).toEqual({ text: '6', note: 'set as None in the signature' })
  expect(defaultText(f('None', '100'))).toEqual({ text: '100', note: 'set as None in the signature' })
  expect(defaultText(f('1.0', '1.0'))).toEqual({ text: '1.0', note: null })
  expect(defaultText(f('None', null))).toEqual({ text: 'None', note: null })
  expect(defaultText({ by_target: { a: f('1', null), b: f('2', null) } })?.text).toBe('varies by library')
  expect(defaultText(undefined)).toBeNull()
})

test('Header: a model page hides the duplicate stage badge and keeps a stage dot', async () => {
  show('xgboost')
  await screen.findByRole('article')
  expect(document.querySelector('[data-slot="stage-badge"]')).toBeNull()
  const badge = document.querySelector('[data-slot="archetype-badge"]') as HTMLElement
  expect(badge.querySelector('[data-stage-dot]')).not.toBeNull()
  expect(badge).toHaveTextContent('Model, stage Model')
})

test('Header: a transformer page shows both badges', async () => {
  show('standardscaler')
  await screen.findByRole('article')
  expect(document.querySelector('[data-slot="stage-badge"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="archetype-badge"] [data-stage-dot]')).toBeNull()
})

test('Show connections lists Used by for n-estimators, linking to the pages', async () => {
  const user = userEvent.setup()
  show('n-estimators')
  await screen.findByRole('article')
  await user.click(screen.getByRole('button', { name: /Show connections/ }))
  const group = document.querySelector('[data-rel-group="used_by"]') as HTMLElement
  expect(within(group).getByText('Used by')).toBeInTheDocument()
  expect(within(group).getByRole('link', { name: 'XGBoost' })).toHaveAttribute('href', '/page/xgboost')
})
