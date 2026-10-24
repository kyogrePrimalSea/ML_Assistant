import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CodeBlock } from './CodeBlock'

const code = '# scikit-learn 1.8\nfrom sklearn.linear_model import Ridge\nm = Ridge(alpha=1.0)  # "ok"'

test('renders the snippet text unchanged, with no extra stamp line', () => {
  const { container } = render(<CodeBlock code={code} />)
  expect(container.querySelector('code')?.textContent).toBe(code + '\n')
})

test('copy button copies the exact snippet and announces Copied', async () => {
  const user = userEvent.setup()
  render(<CodeBlock code={code} />)
  await user.click(screen.getByRole('button', { name: 'Copy code' }))
  expect(await navigator.clipboard.readText()).toBe(code)
  expect(screen.getByRole('status')).toHaveTextContent('Copied')
})

test('a long line is soft-wrapped in the view but copied unwrapped', async () => {
  const user = userEvent.setup()
  const long = '# scikit-learn 1.8\nresult = some_function(' + 'argument_value, '.repeat(20) + ')'
  const { container } = render(<CodeBlock code={long} />)
  const lines = container.querySelectorAll('.code-line')
  expect(lines.length).toBe(2)
  expect(container.querySelector('pre')).toHaveAttribute('data-code-wrap')
  expect(container.querySelector('pre')?.className).not.toMatch(/overflow-x-auto/)
  await user.click(screen.getByRole('button', { name: 'Copy code' }))
  expect(await navigator.clipboard.readText()).toBe(long)
  // The first line is still the version stamp.
  expect(lines[0].textContent).toBe('# scikit-learn 1.8\n')
})
