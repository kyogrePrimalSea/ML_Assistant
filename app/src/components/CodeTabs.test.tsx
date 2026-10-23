import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CodeTabs } from './CodeTabs'

const tabs = [
  { library: 'scikit-learn', why_this_library: 'Pipelines.', code: '# sklearn\nx = 1' },
  { library: 'statsmodels', why_this_library: 'P-values.', code: '# statsmodels\ny = 2' },
]

test('shows the first library and switches on click', async () => {
  const user = userEvent.setup()
  render(<CodeTabs tabs={tabs} />)
  expect(screen.getByText('Pipelines.')).toBeVisible()
  expect(screen.queryByText('P-values.')).toBeNull()
  await user.click(screen.getByRole('tab', { name: 'statsmodels' }))
  expect(screen.getByText('P-values.')).toBeVisible()
})

test('arrow keys move between tabs', async () => {
  const user = userEvent.setup()
  render(<CodeTabs tabs={tabs} />)
  screen.getByRole('tab', { name: 'scikit-learn' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'statsmodels' })).toHaveFocus()
  expect(screen.getByRole('tab', { name: 'statsmodels' })).toHaveAttribute('aria-selected', 'true')
})
