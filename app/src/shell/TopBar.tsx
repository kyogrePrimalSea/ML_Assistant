import {
  IconBinaryTree2,
  IconDeviceDesktop,
  IconMoon,
  IconRoute,
  IconSearch,
  IconSettings,
  IconSun,
  IconTopologyStar3,
} from '@tabler/icons-react'
import { useIndex } from '@/content/load'
import type { TrackId } from '@/content/types'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { useShellState, type ViewId } from './ShellState'

const VIEWS: { id: ViewId; label: string; Icon: typeof IconBinaryTree2 }[] = [
  { id: 'tree', label: 'Tree', Icon: IconBinaryTree2 },
  { id: 'constellation', label: 'Constellation', Icon: IconTopologyStar3 },
  { id: 'journey', label: 'Journey', Icon: IconRoute },
]

const THEMES: { id: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { id: 'light', label: 'Light', Icon: IconSun },
  { id: 'dark', label: 'Dark', Icon: IconMoon },
  { id: 'system', label: 'System', Icon: IconDeviceDesktop },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function TopBar({ onSearch, onSettings }: { onSearch: () => void; onSettings: () => void }) {
  const { data } = useIndex()
  const { track, setTrack, view, setView } = useShellState()
  const { preference, setTheme } = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-surface-1 px-4">
      <h1 className="mr-1 shrink-0 text-lg whitespace-nowrap">ML Field Guide</h1>

      <Button variant="outline" onClick={onSearch} className="w-36 min-w-0 justify-between px-3 text-text-muted min-[1200px]:w-44">
        <span className="flex items-center gap-2">
          <IconSearch aria-hidden /> Search
        </span>
        <kbd className="hidden rounded-sm min-[1200px]:inline border border-border px-1.5 text-xs">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </Button>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <span className="sr-only">Track</span>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value as TrackId)}
          aria-label="Track"
          className="h-10 rounded-md border border-border-strong bg-surface-1 px-3 text-sm font-bold text-text"
        >
          {(data?.vocab.tracks ?? [{ id: 'standard', name: 'Standard (supervised)', wave: 1 }]).map((t) => (
            <option key={t.id} value={t.id} disabled={t.wave === 'later'}>
              {t.name}
              {t.wave === 'later' ? ' (later)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <ToggleGroup
        type="single"
        variant="outline"
        value={view}
        onValueChange={(v) => v && setView(v as ViewId)}
        aria-label="View"
      >
        {VIEWS.map(({ id, label, Icon }) => (
          <ToggleGroupItem key={id} value={id} aria-label={label} title={label} className="h-10 gap-2 px-2.5 min-[1200px]:px-3">
            <Icon aria-hidden />
            <span className="hidden min-[1200px]:inline">{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ToggleGroup
        type="single"
        variant="outline"
        value={preference}
        onValueChange={(v) => v && setTheme(v as ThemePreference)}
        aria-label="Theme"
      >
        {THEMES.map(({ id, label, Icon }) => (
          <ToggleGroupItem key={id} value={id} aria-label={label} title={label} className="size-10">
            <Icon aria-hidden />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button variant="outline" size="icon" onClick={onSettings} aria-label="Accessibility settings" title="Reading settings">
        <IconSettings aria-hidden />
      </Button>
    </header>
  )
}
