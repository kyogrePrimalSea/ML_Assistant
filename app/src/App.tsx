import { Route, Routes } from 'react-router'
import Styleguide from '@/dev/Styleguide'

export default function App() {
  return (
    <Routes>
      <Route path="/styleguide" element={<Styleguide />} />
      <Route
        path="*"
        element={
          <main>
            <h1>ML Field Guide</h1>
          </main>
        }
      />
    </Routes>
  )
}
