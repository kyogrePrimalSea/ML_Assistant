import {
  IconBinaryTree2,
  IconHammer,
  IconDeviceDesktop,
  IconMoon,
  IconRoute,
  IconSearch,
  IconSettings,
  IconSun,
  IconTopologyStar3,
} from '@tabler/icons-react'
import { Link, useMatch, useNavigate } from 'react-router'
import { useIndex } from '@/content/load'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { useShellState, type LabelMode, type ViewId } from './ShellState'

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
  const { goal, setGoal, labels, setLabels, view, setView } = useShellState()
  const { preference, setTheme } = useTheme()
  const onBuild = useMatch('/build') !== null
  const navigate = useNavigate()

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-surface-1 px-4">
      <h1 className="mr-1 shrink-0 text-lg whitespace-nowrap">ML Field Guide</h1>

      <Button variant="outline" onClick={onSearch} title="Search" className="w-10 min-w-0 shrink-0 justify-center px-0 text-text-muted min-[1200px]:w-40 min-[1200px]:justify-between min-[1200px]:px-3">
        <span className="flex items-center gap-2">
          <IconSearch aria-hidden /> <span className="sr-only min-[1200px]:not-sr-only">Search</span>
        </span>
        <kbd className="hidden rounded-sm min-[1200px]:inline border border-border px-1.5 text-xs">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </Button>

      <label className="flex shrink-0 items-center gap-2 text-sm text-text-muted">
        <span className="sr-only min-[1200px]:not-sr-only min-[1200px]:whitespace-nowrap">What are we trying to do?</span>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          aria-label="What are we trying to do?"
          className="h-10 w-[13.5rem] rounded-md border border-border-strong bg-surface-1 px-2 text-sm font-bold text-text"
        >
          {(data?.taxonomy?.goals ?? [{ id: goal, names_label: 'Standard · Regression', question_label: 'Predict a number' }]).map((g) => (
            <option key={g.id} value={g.id}>
              {labels === 'questions' ? g.question_label : g.names_label}
            </option>
          ))}
        </select>
      </label>

      <ToggleGroup
        type="single"
        variant="outline"
        value={labels}
        onValueChange={(v) => v && setLabels(v as LabelMode)}
        aria-label="Labels"
        className="shrink-0"
      >
        <ToggleGroupItem value="names" aria-label="Names" className="h-10 px-2.5 min-[1200px]:px-3">
          Names
        </ToggleGroupItem>
        <ToggleGroupItem value="questions" aria-label="Questions" className="h-10 px-2.5 min-[1200px]:px-3">
          Questions
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex-1" />

      <ToggleGroup
        type="single"
        variant="outline"
        value={onBuild ? '' : view}
        onValueChange={(v) => {
          if (!v) return
          setView(v as ViewId)
          if (onBuild) navigate('/')
        }}
        aria-label="View"
      >
        {VIEWS.map(({ id, label, Icon }) => (
          <ToggleGroupItem key={id} value={id} aria-label={label} title={label} className="h-10 gap-2 px-2.5 min-[1200px]:px-3">
            <Icon aria-hidden />
            <span className="hidden min-[1200px]:inline">{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button asChild variant="outline" className="h-10 shrink-0 gap-2 px-2.5 min-[1200px]:px-3" title="Build (beta)">
        <Link to="/build" aria-current={onBuild ? 'page' : undefined} aria-label="Build (beta)" className={onBuild ? 'border-accent bg-surface-2' : undefined}>
          <IconHammer aria-hidden />
          <span className="hidden min-[1200px]:inline">Build (beta)</span>
        </Link>
      </Button>

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
