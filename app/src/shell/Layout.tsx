import { useEffect, useState, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from '@/components/ui/command'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StarField } from './StarField'
import { TopBar } from './TopBar'
import { useMediaQuery } from './useMediaQuery'
import './shell.css'

/**
 * Top bar, canvas (left, ~60%) and page panel (right, ~40%, 420 to 560px).
 * Below 900px the canvas fills the screen and the panel is a bottom sheet.
 * Tab order follows the DOM: top bar, canvas, panel.
 */
export default function Layout({
  children,
  panel,
  onClosePanel,
  fill = false,
}: {
  children: ReactNode
  /** Children fill the canvas themselves (the tree), instead of scrolling in a column. */
  fill?: boolean
  /** Panel content, or null when closed. */
  panel: ReactNode | null
  onClosePanel: () => void
}) {
  const wide = useMediaQuery('(min-width: 900px)')
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const open = panel !== null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (e.key === 'Escape' && open && wide && !document.querySelector('[role="dialog"]')) {
        onClosePanel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, wide, onClosePanel])

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <TopBar onSearch={() => setSearchOpen(true)} onSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <main aria-label="Catalogue" className="relative min-w-0 flex-1 bg-canvas">
          <StarField />
          {fill ? (
            <div className="relative h-full">{children}</div>
          ) : (
            <div className="relative h-full overflow-y-auto">
              <div className="mx-auto max-w-3xl px-6 py-6">{children}</div>
            </div>
          )}
        </main>

        {open && wide ? (
          <aside
            aria-label="Page panel"
            className="shell-panel-enter flex w-[40%] max-w-[560px] min-w-[420px] shrink-0 flex-col border-l border-border bg-surface-1"
          >
            <div className="flex justify-end border-b border-border px-4 py-2">
              <Button variant="ghost" size="sm" onClick={onClosePanel}>
                <IconX aria-hidden /> Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-[68ch]">{panel}</div>
            </div>
          </aside>
        ) : null}
      </div>

      {!wide ? (
        <Sheet open={open} onOpenChange={(o) => !o && onClosePanel()}>
          <SheetContent side="bottom" className="shell-sheet-bottom max-h-[80dvh] gap-0 rounded-t-lg">
            <SheetHeader className="border-b border-border px-6 py-4">
              <SheetTitle>Page panel</SheetTitle>
              <SheetDescription className="sr-only">Details for the selected page.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-6 py-6">
              <div className="max-w-[68ch]">{panel}</div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search"
        description="Search every page in the guide."
      >
        <CommandInput placeholder="Search pages" />
        <CommandList>
          <CommandEmpty>Search is coming soon.</CommandEmpty>
        </CommandList>
      </CommandDialog>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Reading settings</SheetTitle>
            <SheetDescription>Font, text size and line spacing will live here.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  )
}
