import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from '@/components/CodeBlock'

export type CodeTab = {
  library: string
  why_this_library: string
  code: string
}

/** Slot 6: one tab per library, each with its one-line reason above the snippet. */
export function CodeTabs({ tabs, className }: { tabs: CodeTab[]; className?: string }) {
  if (tabs.length === 0) return <p className="text-text-muted">None</p>
  return (
    <Tabs defaultValue={tabs[0].library} className={className}>
      <TabsList aria-label="Library">
        {tabs.map((t) => (
          <TabsTrigger key={t.library} value={t.library}>
            {t.library}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.library} value={t.library} className="grid gap-3">
          <p className="m-0 text-text">{t.why_this_library}</p>
          <CodeBlock code={t.code} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
