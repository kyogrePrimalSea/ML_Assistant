import { Route, Routes, useMatch, useNavigate } from 'react-router'
import Styleguide from '@/dev/Styleguide'
import { PagePanel } from '@/page/PagePanel'
import Layout from '@/shell/Layout'
import { ShellStateProvider, useShellState } from '@/shell/ShellState'
import CatalogueList from '@/views/CatalogueList'

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface-1 p-6">
      <h2>{name}</h2>
      <p className="text-text-muted">Coming soon. The Tree view is the one to use for now.</p>
    </div>
  )
}

function Shell() {
  const id = useMatch('/page/:id')?.params.id
  const navigate = useNavigate()
  const { view } = useShellState()
  return (
    <Layout panel={id ? <PagePanel id={id} /> : null} onClosePanel={() => navigate('/')}>
      {view === 'tree' ? (
        <CatalogueList activeId={id} />
      ) : view === 'constellation' ? (
        <ComingSoon name="Constellation" />
      ) : (
        <ComingSoon name="Journey" />
      )}
    </Layout>
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
