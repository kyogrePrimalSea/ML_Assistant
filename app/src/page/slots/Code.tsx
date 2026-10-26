import { CodeTabs } from '@/components/CodeTabs'
import type { CodeTab } from '@/content/types'
import { None, Slot } from './shared'

export function Code({ tabs }: { tabs: CodeTab[] }) {
  return (
    <Slot name="code" title="Code">
      {tabs.length === 0 ? (
        <None />
      ) : (
        <CodeTabs
          className="min-w-0 [&_[data-slot=tabs-content]]:min-w-0 [&_[data-slot=tabs-content]]:grid-cols-1 [&_[data-slot=code-block]]:min-w-0"
          tabs={tabs.map((t) => ({
            library: t.library,
            why_this_library: t.why_this_library,
            code: t.snippet,
            output: t.output,
          }))} />
      )}
    </Slot>
  )
}
