import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useIndex, usePage } from '@/content/load'
import type { PageData } from '@/content/types'
import { IndexContext } from './slots/context'
import { CatchOuts } from './slots/CatchOuts'
import { Code } from './slots/Code'
import { Header } from './slots/Header'
import { Intuition } from './slots/Intuition'
import { KeySettings } from './slots/KeySettings'
import { Next } from './slots/Next'
import { Prep } from './slots/Prep'
import { QuickFacts } from './slots/QuickFacts'
import { Solves } from './slots/Solves'
import { UseAvoid } from './slots/UseAvoid'
import { WatchItWork } from './slots/WatchItWork'
import { WhatComesOut } from './slots/WhatComesOut'

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-2" role="status">
      <h2 className="m-0">{title}</h2>
      {children}
    </div>
  )
}

/** The 12 slots, always in this order (spec 5.1). */
function Page({ data }: { data: PageData }) {
  const { record, key_setting_facts } = data
  const s = record.slots
  return (
    <article aria-label={record.plain_name} data-page-id={record.id}>
      <Header record={record} />
      <div className="grid min-w-0 grid-cols-1">
        <Solves data={s.solves} family={record.family} pageId={record.id} />
        <QuickFacts record={record} />
        <UseAvoid data={s.use_avoid} />
        <Prep entries={s.prep} />
        <Code tabs={s.code} />
        <WhatComesOut data={s.what_comes_out} pageId={record.id} />
        <CatchOuts items={s.catch_outs} />
        <KeySettings data={s.key_settings} facts={key_setting_facts} />
        <WatchItWork data={s.watch_it_work} pageId={record.id} family={record.family} />
        <Intuition data={s.intuition} />
        <Next ids={s.next} />
      </div>
    </article>
  )
}

export function PagePanel({ id }: { id: string }) {
  const index = useIndex()
  const page = usePage(id)
  const root = useRef<HTMLDivElement>(null)

  // Moving to another page from a link inside the panel starts at the top.
  useEffect(() => {
    const scroller = root.current?.closest<HTMLElement>('.overflow-y-auto')
    scroller?.scrollTo?.({ top: 0 })
  }, [id])

  const entry = index.data?.pages.find((p) => p.id === id)
  let body
  if (page.data) {
    body = <Page data={page.data} />
  } else if (page.loading) {
    body = <Message title="Loading">{null}</Message>
  } else if (entry && !entry.has_record) {
    body = (
      <Message title={entry.plain_name}>
        <p className="m-0 text-text-muted">This page is not written yet.</p>
      </Message>
    )
  } else if (!entry && index.data) {
    body = (
      <Message title="Page not found">
        <p className="m-0 text-text-muted">
          There is no page called <code>{id}</code>. <Link to="/">Back to the catalogue</Link>
        </p>
      </Message>
    )
  } else {
    body = (
      <Message title="Could not load this page">
        <p className="m-0 text-text-muted">Check the connection and open the page again.</p>
      </Message>
    )
  }

  return (
    <IndexContext.Provider value={index.data}>
      <div ref={root} className="pb-8">
        {body}
      </div>
    </IndexContext.Provider>
  )
}
