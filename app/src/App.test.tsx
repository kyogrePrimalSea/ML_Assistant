import { render, screen } from '@testing-library/react'
import { HashRouter } from 'react-router'
import App from './App'

test('renders the app title', () => {
  render(
    <HashRouter>
      <App />
    </HashRouter>,
  )
  expect(screen.getByRole('heading', { name: 'ML Field Guide' })).toBeInTheDocument()
})
