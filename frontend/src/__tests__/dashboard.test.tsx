import React from 'react'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import DashboardPage from '@/app/dashboard/page'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => '/dashboard',
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'test-token')
  })

  it('renders stat cards (Total Skills, Active Agents, Verified Creds, Success Rate)', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'agents') return { data: [] }
      if (queryKey[0] === 'monitoring-stats') return { data: { success_rate: 95, total_runs: 10, avg_latency_ms: 200, total_tokens: 5000 } }
      if (queryKey[0] === 'monitoring-runs') return { data: [] }
      if (queryKey[0] === 'credentials') return { data: [] }
      if (queryKey[0] === 'skills-catalog') return { data: [] }
      return { data: undefined }
    })

    render(<DashboardPage />)

    expect(screen.getByText('Total Skills')).toBeInTheDocument()
    expect(screen.getByText('Active Agents')).toBeInTheDocument()
    expect(screen.getByText('Verified Creds')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
  })

  it('displays correct count from API response', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'agents') return { data: [{ id: '1', is_active: true }, { id: '2', is_active: false }] }
      if (queryKey[0] === 'monitoring-stats') return { data: { success_rate: 85, total_runs: 42, avg_latency_ms: 150, total_tokens: 8000 } }
      if (queryKey[0] === 'monitoring-runs') return { data: [] }
      if (queryKey[0] === 'credentials') return { data: [{ id: '1', is_verified: true }, { id: '2', is_verified: true }] }
      if (queryKey[0] === 'skills-catalog') return { data: [{ id: 'cat1', icon: '🧠', name: 'AI', credType: 'generic', tags: [{ skills: [{ name: 's1' }, { name: 's2' }] }] }] }
      return { data: undefined }
    })

    render(<DashboardPage />)

    // Active Agents: 1 active out of 2
    expect(screen.getByText('1')).toBeInTheDocument()
    // Verified Creds: 2 and Total Skills: 2 - both show '2'
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    // Success Rate: 85%
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('shows 0 counts on empty API response', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'agents') return { data: [] }
      if (queryKey[0] === 'monitoring-stats') return { data: null }
      if (queryKey[0] === 'monitoring-runs') return { data: [] }
      if (queryKey[0] === 'credentials') return { data: [] }
      if (queryKey[0] === 'skills-catalog') return { data: [] }
      return { data: undefined }
    })

    render(<DashboardPage />)

    // Stats value should be '—' when stats is null
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders Dashboard heading and description', () => {
    ;(useQuery as jest.Mock).mockReturnValue({ data: [] })

    render(<DashboardPage />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('AI Studio overview and quick actions')).toBeInTheDocument()
  })

  it('renders Quick Start section', () => {
    ;(useQuery as jest.Mock).mockReturnValue({ data: [] })

    render(<DashboardPage />)

    expect(screen.getByText('Quick Start')).toBeInTheDocument()
    expect(screen.getByText('Add Entra Credential')).toBeInTheDocument()
    expect(screen.getByText('Create Agent')).toBeInTheDocument()
    expect(screen.getByText('Try Playground')).toBeInTheDocument()
  })

  it('redirects to /login if no auth token', () => {
    localStorage.clear()

    ;(useQuery as jest.Mock).mockReturnValue({ data: [] })

    render(<DashboardPage />)

    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('renders recent executions section', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'monitoring-runs') return {
        data: [
          { id: 'r1', status: 'completed', agent_name: 'TestAgent', input_text: 'hello', execution_time_ms: 250 },
        ],
      }
      if (queryKey[0] === 'agents') return { data: [] }
      if (queryKey[0] === 'monitoring-stats') return { data: { success_rate: 90, total_runs: 5 } }
      if (queryKey[0] === 'credentials') return { data: [] }
      if (queryKey[0] === 'skills-catalog') return { data: [] }
      return { data: undefined }
    })

    render(<DashboardPage />)

    expect(screen.getByText('Recent Executions')).toBeInTheDocument()
    expect(screen.getByText('TestAgent')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('shows empty runs message when no runs', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'monitoring-runs') return { data: [] }
      if (queryKey[0] === 'agents') return { data: [] }
      if (queryKey[0] === 'monitoring-stats') return { data: null }
      if (queryKey[0] === 'credentials') return { data: [] }
      if (queryKey[0] === 'skills-catalog') return { data: [] }
      return { data: undefined }
    })

    render(<DashboardPage />)

    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument()
  })
})
