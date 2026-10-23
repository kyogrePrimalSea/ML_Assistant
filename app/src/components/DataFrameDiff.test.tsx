import { render, screen } from '@testing-library/react'
import { DataFrameDiff } from './DataFrameDiff'

const props = {
  before: { columns: ['LotArea', 'Street', 'Neighborhood'], rows: [[8450, 'Pave', 'CollgCr'], [9600, 'Pave', 'Veenker']] },
  after: { columns: ['LotArea', 'Neighborhood', 'Neighborhood_CollgCr'], rows: [[8450, 'CollgCr', 1], [9999, 'Veenker', 0]] },
  changed: [[1, 0]] as [number, number][],
  added: ['Neighborhood_CollgCr'],
  removed: ['Street'],
  beforeShape: [1460, 81] as [number, number],
  afterShape: [1460, 262] as [number, number],
}

test('shows the shape line with thousands separators', () => {
  render(<DataFrameDiff {...props} />)
  expect(screen.getByText('1,460 × 81 → 1,460 × 262')).toBeInTheDocument()
})

test('shape line falls back to the frames when no full shape is given', () => {
  render(<DataFrameDiff {...props} beforeShape={undefined} afterShape={undefined} />)
  expect(screen.getByText('2 × 3 → 2 × 3')).toBeInTheDocument()
})

test('marks added and removed columns with icons, and changed cells', () => {
  const { container } = render(<DataFrameDiff {...props} />)
  expect(screen.getByRole('table', { name: /1 changed cell, 1 added column, 1 removed column/ })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Added column' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Removed column' })).toBeInTheDocument()
  expect(container.querySelector('th[data-state="added"]')).toHaveTextContent('Neighborhood_CollgCr')
  expect(container.querySelector('th[data-state="removed"]')).toHaveTextContent('Street')
  const changed = container.querySelectorAll('td[data-state="changed"]')
  expect(changed).toHaveLength(1)
  expect(changed[0]).toHaveTextContent('9999')
})
