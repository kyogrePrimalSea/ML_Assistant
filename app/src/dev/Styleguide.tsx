import type { ReactNode } from 'react'
import { IconDeviceDesktop, IconMoon, IconPlus, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Callout } from '@/components/Callout'
import { StageBadge, STAGES, type Stage } from '@/components/StageBadge'
import { CodeTabs } from '@/components/CodeTabs'
import { DataFrameDiff } from '@/components/DataFrameDiff'
import { StatusChip, type Severity } from '@/components/StatusChip'
import { useTheme, type ThemePreference } from '@/lib/theme'

const SURFACE_TOKENS = ['bg', 'canvas', 'surface-1', 'surface-2', 'border', 'border-strong', 'code-bg']
const TEXT_TOKENS = ['text', 'text-muted', 'text-subtle']
const ACCENT_TOKENS = ['accent', 'accent-strong', 'on-accent']
const SEVERITIES: Severity[] = ['block', 'warn', 'tip', 'valid']

const RELATIONSHIPS = [
  { name: 'Needs', token: 'rel-needs', dash: undefined, width: 2 },
  { name: 'Recommended', token: 'rel-recommended', dash: '6 4', width: 2 },
  { name: 'Clashes', token: 'rel-clashes', dash: '2 4', width: 2 },
  { name: 'Alternative to', token: 'rel-alternative', dash: '10 4', width: 2 },
  { name: 'Pairs with', token: 'rel-pairs', dash: undefined, width: 1, double: true },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-md border border-border-strong"
        style={{ background: `var(--${token})` }}
        aria-hidden
      />
      <code className="text-sm">--{token}</code>
    </div>
  )
}

const TYPE_SCALE: [string, string, string][] = [
  ['Display 36', 'text-3xl', 'font-head'],
  ['Heading 1, 28', 'text-2xl', 'font-head'],
  ['Heading 2, 22', 'text-xl', 'font-head'],
  ['Heading 3, 18', 'text-lg', 'font-head'],
  ['Body 16', 'text-base', ''],
  ['UI small 14', 'text-sm', ''],
  ['Caption 12', 'text-xs', ''],
]

const CODE_TABS = [
  {
    library: 'scikit-learn',
    why_this_library: 'Fits inside a Pipeline, so the same steps run on train and test.',
    code: `# scikit-learn 1.8
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
model.fit(X_train, y_train)  # X_train: 1460 rows
print(model.score(X_test, y_test))`,
  },
  {
    library: 'statsmodels',
    why_this_library: 'Gives p-values and confidence intervals for each coefficient.',
    code: `# statsmodels 0.15
import statsmodels.api as sm

X = sm.add_constant(X_train)
result = sm.OLS(y_train, X).fit()
print(result.summary())`,
  },
]

const DIFF = {
  before: {
    columns: ['LotArea', 'Street', 'Neighborhood', 'SalePrice'],
    rows: [
      [8450, 'Pave', 'CollgCr', 208500],
      [9600, 'Pave', 'Veenker', 181500],
      [11250, 'Pave', 'CollgCr', 223500],
    ],
  },
  after: {
    columns: ['LotArea', 'Neighborhood', 'SalePrice', 'Neighborhood_CollgCr', 'Neighborhood_Veenker'],
    rows: [
      [8450, 'CollgCr', 208500, 1, 0],
      [9600, 'Veenker', 181500, 0, 1],
      [11250, 'CollgCr', 223500, 1, 0],
    ],
  },
  changed: [[1, 0], [2, 0]] as [number, number][],
  added: ['Neighborhood_CollgCr', 'Neighborhood_Veenker'],
  removed: ['Street'],
}

export default function Styleguide() {
  const { preference, resolved, setTheme } = useTheme()

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-8 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1>Styleguide</h1>
          <p className="text-text-muted">
            Observatory tokens in the {resolved} theme. Panels stay calm; drama is for canvases.
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={preference}
          onValueChange={(v) => v && setTheme(v as ThemePreference)}
          aria-label="Theme"
        >
          <ToggleGroupItem value="light" className="gap-2 px-3">
            <IconSun aria-hidden /> Light
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="gap-2 px-3">
            <IconMoon aria-hidden /> Dark
          </ToggleGroupItem>
          <ToggleGroupItem value="system" className="gap-2 px-3">
            <IconDeviceDesktop aria-hidden /> System
          </ToggleGroupItem>
        </ToggleGroup>
      </header>

      <Section title="Type scale">
        <div className="grid gap-3 rounded-lg border border-border bg-surface-1 p-6">
          {TYPE_SCALE.map(([label, cls, font]) => (
            <p key={label} className={`${cls} ${font}`.trim()}>
              {label}: Which function fits this stage?
            </p>
          ))}
          <p>
            Body text is left-aligned with line-height 1.6. Emphasis uses <em>weight, not italics</em>.
            Inline code looks like <code>df.fillna(0)</code> with ligatures off: <code>!= {'=>'} -&gt; 0O 1lI</code>.
          </p>
          <pre>
            <code>{`# scikit-learn 1.7
from sklearn.impute import SimpleImputer

imputer = SimpleImputer(strategy="median")  # fills 0 gaps
X_clean = imputer.fit_transform(X_train)`}</code>
          </pre>
        </div>
      </Section>

      <Section title="Colours">
        <div className="grid grid-cols-3 gap-6 rounded-lg border border-border bg-surface-1 p-6">
          <div className="grid content-start gap-3">
            {SURFACE_TOKENS.map((t) => (
              <Swatch key={t} token={t} />
            ))}
          </div>
          <div className="grid content-start gap-3">
            {[...TEXT_TOKENS, ...ACCENT_TOKENS].map((t) => (
              <Swatch key={t} token={t} />
            ))}
          </div>
          <div className="grid content-start gap-2">
            <p className="text-text">text</p>
            <p className="text-text-muted">text-muted</p>
            <p className="text-text-subtle">text-subtle</p>
            <p className="text-accent">accent</p>
            <p className="text-accent-strong">accent-strong</p>
            <p>
              <a href="#/styleguide">A link in the page</a>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Severity: chips and callouts">
        <div className="flex flex-wrap gap-3">
          {SEVERITIES.map((s) => (
            <StatusChip key={s} severity={s} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Callout severity="block">This step needs a fitted imputer before it can run.</Callout>
          <Callout severity="warn">Scaling before the split leaks test data into training.</Callout>
          <Callout severity="tip">Try median instead of mean when the column has outliers.</Callout>
          <Callout severity="valid" title="Ready to export">
            Every step has its inputs.
          </Callout>
        </div>
      </Section>

      <Section title="Stages: outline, dot and icon">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(STAGES) as Stage[]).map((s) => (
            <StageBadge key={s} stage={s} />
          ))}
        </div>
        <div className="rounded-lg border border-border bg-canvas p-6">
          <p className="mb-3 text-sm text-text-muted">On the canvas background</p>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(STAGES) as Stage[]).map((s) => (
              <StageBadge key={s} stage={s} />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Relationship lines">
        <div className="grid gap-3 rounded-lg border border-border bg-canvas p-6">
          {RELATIONSHIPS.map((r) => (
            <div key={r.name} className="flex items-center gap-4">
              <svg width="120" height="12" aria-hidden>
                {r.double ? (
                  <>
                    <line x1="0" x2="120" y1="3" y2="3" stroke={`var(--${r.token})`} strokeWidth="1" />
                    <line x1="0" x2="120" y1="9" y2="9" stroke={`var(--${r.token})`} strokeWidth="1" />
                  </>
                ) : (
                  <line
                    x1="0"
                    x2="120"
                    y1="6"
                    y2="6"
                    stroke={`var(--${r.token})`}
                    strokeWidth={r.width}
                    strokeDasharray={r.dash}
                    strokeLinecap="butt"
                  />
                )}
              </svg>
              <span>{r.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons and badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Remove step</Button>
          <Button variant="link">Link style</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">
            <IconPlus aria-hidden /> Add step
          </Button>
          <Button size="icon" variant="outline" aria-label="Add">
            <IconPlus aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="what" className="max-w-xl">
          <TabsList>
            <TabsTrigger value="what">What it does</TabsTrigger>
            <TabsTrigger value="when">When to use it</TabsTrigger>
            <TabsTrigger value="how">How to call it</TabsTrigger>
          </TabsList>
          <TabsContent value="what" className="rounded-lg border border-border bg-surface-1 p-4">
            Fills missing values with a statistic learned from the training data.
          </TabsContent>
          <TabsContent value="when" className="rounded-lg border border-border bg-surface-1 p-4">
            Use it before any model that cannot accept missing values.
          </TabsContent>
          <TabsContent value="how" className="rounded-lg border border-border bg-surface-1 p-4">
            <code>SimpleImputer(strategy=&quot;median&quot;)</code>
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="a" className="max-w-xl">
          <TabsList variant="line">
            <TabsTrigger value="a">Line tab one</TabsTrigger>
            <TabsTrigger value="b">Line tab two</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-3">
            The line variant marks the active tab with an accent underline.
          </TabsContent>
          <TabsContent value="b" className="pt-3">
            Second panel.
          </TabsContent>
        </Tabs>
      </Section>
      <Section title="Code tabs">
        <CodeTabs tabs={CODE_TABS} className="max-w-3xl" />
      </Section>

      <Section title="Data-frame diff">
        <DataFrameDiff {...DIFF} beforeShape={[1460, 81]} afterShape={[1460, 262]} />
      </Section>
    </main>
  )
}
