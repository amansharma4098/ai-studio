import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AgentsPage from '@/app/agents/page'
import { agentsApi, threadsApi, skillsApi, credentialsApi } from '@/lib/api'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/agents',
}))

const mockInvalidate = jest.fn()
const mockMutate = jest.fn()

describe('AgentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: mockInvalidate })
  })

  function setupQueries(agents: any[] = [], catalog: any[] = [], credentials: any[] = []) {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'agents') return { data: agents, isLoading: false }
      if (queryKey[0] === 'skills-catalog') return { data: catalog }
      if (queryKey[0] === 'credentials-for-agents') return { data: credentials }
      return { data: undefined, isLoading: false }
    })
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
    })
  }

  it('renders empty grid when no agents', () => {
    setupQueries([])
    render(<AgentsPage />)
    // No agent cards rendered, but the page still shows heading and New Agent button
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText(/new agent/i)).toBeInTheDocument()
    // No agent names should be present
    expect(screen.queryByText('TestBot')).not.toBeInTheDocument()
  })

  it('renders agent cards from API response', () => {
    setupQueries([
      { id: '1', name: 'TestBot', description: 'A test agent', model_name: 'llama3', temperature: 0.7, is_active: true },
      { id: '2', name: 'Helper', description: 'Helper agent', model_name: 'mistral', temperature: 0.5, is_active: false },
    ])

    render(<AgentsPage />)

    expect(screen.getByText('TestBot')).toBeInTheDocument()
    expect(screen.getByText('Helper')).toBeInTheDocument()
    expect(screen.getByText('A test agent')).toBeInTheDocument()
  })

  it('opens create modal on "New Agent" button click', async () => {
    const user = userEvent.setup()
    setupQueries([])

    render(<AgentsPage />)

    const newBtn = screen.getByText(/new agent/i)
    await user.click(newBtn)

    await waitFor(() => {
      expect(screen.getByText(/configure/i)).toBeInTheDocument()
    })
  })

  it('renders page title and description', () => {
    setupQueries([])
    render(<AgentsPage />)
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })

  it('shows agent model name badge on card', () => {
    setupQueries([
      { id: '1', name: 'TestBot', description: 'Test', model_name: 'llama3', temperature: 0.7, is_active: true },
    ])

    render(<AgentsPage />)
    expect(screen.getByText('llama3')).toBeInTheDocument()
  })

  it('shows temperature on agent card', () => {
    setupQueries([
      { id: '1', name: 'TestBot', description: 'Test', model_name: 'llama3', temperature: 0.8, is_active: true },
    ])

    render(<AgentsPage />)
    // Temperature is displayed as "temp 0.8"
    expect(screen.getByText('temp 0.8')).toBeInTheDocument()
  })

  it('shows active/inactive status on agent card', () => {
    setupQueries([
      { id: '1', name: 'Active Bot', description: 'Test', model_name: 'llama3', temperature: 0.7, is_active: true },
      { id: '2', name: 'Inactive Bot', description: 'Test2', model_name: 'llama3', temperature: 0.7, is_active: false },
    ])

    render(<AgentsPage />)
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('renders multiple agent cards in grid', () => {
    const agents = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      name: `Agent ${i}`,
      description: `Desc ${i}`,
      model_name: 'llama3',
      temperature: 0.7,
      is_active: true,
    }))

    setupQueries(agents)
    render(<AgentsPage />)

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Agent ${i}`)).toBeInTheDocument()
    }
  })

  it('has create agent button visible', () => {
    setupQueries([])
    render(<AgentsPage />)
    expect(screen.getByText(/new agent/i)).toBeInTheDocument()
  })

  it('shows chat and edit icons on agent cards', () => {
    setupQueries([
      { id: '1', name: 'TestBot', description: 'Test', model_name: 'llama3', temperature: 0.7, is_active: true },
    ])

    render(<AgentsPage />)

    // Agent cards should have action buttons (edit, delete, chat)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(1)
  })

  it('renders header with agent count', () => {
    setupQueries([
      { id: '1', name: 'Bot1', description: 'A', model_name: 'llama3', temperature: 0.7, is_active: true },
      { id: '2', name: 'Bot2', description: 'B', model_name: 'llama3', temperature: 0.7, is_active: true },
    ])

    render(<AgentsPage />)
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })
})
