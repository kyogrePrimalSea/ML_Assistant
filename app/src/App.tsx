import { Route, Routes, useMatch, useNavigate } from 'react-router'
import Styleguide from '@/dev/Styleguide'
import { useIndex } from '@/content/load'
import { PagePanel } from '@/page/PagePanel'
import Layout from '@/shell/Layout'
import { ShellStateProvider, useShellState } from '@/shell/ShellState'
import { ConnectionsProvider } from '@/views/connections'
import Journey from '@/views/Journey'
import RadialTree from '@/views/RadialTree'

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface-1 p-6">
      <h2>{name}</h2>
      <p className="text-text-muted">Coming soon. The Tree view is the one to use for now.</p>
    </div>
  )
}

/** Placeholder route for follow-up questions; the question view comes later. */
function QuestionPlaceholder({ id }: { id: string }) {
  return (
    <div className="grid gap-2">
      <h2>Question</h2>
      <p className="text-text-muted">
        Question views are coming soon (<code>{id}</code>).
      </p>
    </div>
  )
}

function Shell() {
  const id = useMatch('/page/:id')?.params.id
  const questionId = useMatch('/question/:id')?.params.id
  const navigate = useNavigate()
  const { view } = useShellState()
  const index = useIndex()
  const panelTitle = id
    ? (index.data?.pages.find((p) => p.id === id)?.plain_name ?? 'Page')
    : questionId
      ? 'Question'
      : 'Page'
  return (
    <ConnectionsProvider canDraw={view === 'tree'}>
    <Layout panelTitle={panelTitle} panel={id ? <PagePanel id={id} /> : questionId ? <QuestionPlaceholder id={questionId} /> : null} onClosePanel={() => navigate('/')} fill={view === 'tree' || view === 'journey'}>
      {view === 'tree' ? (
        <RadialTree activeId={id} />
      ) : view === 'constellation' ? (
        <ComingSoon name="Constellation" />
      ) : (
        <Journey />
      )}
    </Layout>
    </ConnectionsProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/styleguide" element={<Styleguide />} />
      <Route
        path="*"
        element={
          <ShellStateProvider>
            <Shell />
          </ShellStateProvider>
        }
      />
    </Routes>
  )
}
