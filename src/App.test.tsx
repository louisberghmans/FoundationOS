import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Foundation OS', () => {
  beforeEach(() => localStorage.clear())

  it('shows the portfolio overview and its north star', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'The family’s giving, in one view.' })).toBeInTheDocument()
    expect(screen.getAllByText('Safe water for 100,000 people').length).toBeGreaterThan(0)
    expect(screen.getByText('€250,000')).toBeInTheDocument()
  })

  it('navigates to the project workflow', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))

    expect(screen.getByRole('heading', { name: 'Project portfolio' })).toBeInTheDocument()
    expect(screen.getByText('Gravity-fed water systems')).toBeInTheDocument()
    expect(screen.getAllByText('Due diligence').length).toBeGreaterThan(0)
  })

  it('opens project intake from the global action', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /New opportunity/i }))

    expect(screen.getByRole('dialog', { name: 'Add an opportunity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Project name')).toBeInTheDocument()
  })
})
