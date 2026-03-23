import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNodesState, useEdgesState } from 'reactflow'
import WorkflowsPage from '@/app/workflows/page'
import { workflowsApi } from '@/lib/api'

const mockInvalidate = jest.fn()
const mockMutate = jest.fn()

describe('WorkflowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: mockInvalidate })
    ;(useNodesState as jest.Mock).mockReturnValue([
      [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'trigger' } }],
      jest.fn(),
      jest.fn(),
    ])
    ;(useEdgesState as jest.Mock).mockReturnValue([
      [{ id: 'e1', source: 'n1', target: 'n2' }],
      jest.fn(),
      jest.fn(),
    ])
  })

  function setupMocks(workflows: any[] = []) {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'workflows') return { data: workflows, isLoading: false }
      return { data: undefined }
    })
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
    })
  }

  it('renders workflow list heading', () => {
    setupMocks()
    render(<WorkflowsPage />)

    expect(screen.getByText('Workflow Builder')).toBeInTheDocument()
    expect(screen.getByText('Saved Workflows')).toBeInTheDocument()
  })

  it('shows empty state when no workflows', () => {
    setupMocks([])
    render(<WorkflowsPage />)

    expect(screen.getByText(/no workflows saved yet/i)).toBeInTheDocument()
  })

  it('renders workflow list from API', () => {
    setupMocks([
      { id: 'w1', name: 'Daily Report', schedule_cron: '0 9 * * 1-5', is_active: true, description: 'Auto report', created_at: '2025-01-01' },
      { id: 'w2', name: 'Backup Job', schedule_cron: null, is_active: false, description: '', created_at: '2025-02-01' },
    ])

    render(<WorkflowsPage />)

    expect(screen.getByText('Daily Report')).toBeInTheDocument()
    expect(screen.getByText('Backup Job')).toBeInTheDocument()
    expect(screen.getByText('0 9 * * 1-5')).toBeInTheDocument()
  })

  it('opens save modal on "Save Workflow" button click', async () => {
    const user = userEvent.setup()
    setupMocks([])

    render(<WorkflowsPage />)

    await user.click(screen.getByText(/save workflow/i))

    await waitFor(() => {
      expect(screen.getByText('Workflow Name')).toBeInTheDocument()
      expect(screen.getByText(/cron schedule/i)).toBeInTheDocument()
    })
  })

  it('workflow appears with status badge', () => {
    setupMocks([
      { id: 'w1', name: 'Active WF', schedule_cron: null, is_active: true, description: '', created_at: '2025-01-01' },
      { id: 'w2', name: 'Inactive WF', schedule_cron: null, is_active: false, description: '', created_at: '2025-01-01' },
    ])

    render(<WorkflowsPage />)

    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('renders node palette with all node types', () => {
    setupMocks()
    render(<WorkflowsPage />)

    expect(screen.getByText('Trigger')).toBeInTheDocument()
    expect(screen.getByText('Agent Node')).toBeInTheDocument()
    expect(screen.getByText('Skill')).toBeInTheDocument()
    expect(screen.getByText('Condition')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows Run Now button for each workflow', () => {
    setupMocks([
      { id: 'w1', name: 'WF1', schedule_cron: null, is_active: true, description: '', created_at: '2025-01-01' },
    ])

    render(<WorkflowsPage />)

    expect(screen.getByText('Run Now')).toBeInTheDocument()
  })

  it('renders React Flow canvas area', () => {
    setupMocks()
    render(<WorkflowsPage />)

    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('shows workflow count in header', () => {
    setupMocks([
      { id: 'w1', name: 'WF1', schedule_cron: null, is_active: true, description: '', created_at: '2025-01-01' },
      { id: 'w2', name: 'WF2', schedule_cron: null, is_active: true, description: '', created_at: '2025-01-01' },
    ])

    render(<WorkflowsPage />)

    expect(screen.getByText('2 workflows')).toBeInTheDocument()
  })

  it('shows node and edge count in save modal', async () => {
    const user = userEvent.setup()
    setupMocks([])

    render(<WorkflowsPage />)

    await user.click(screen.getByText(/save workflow/i))

    await waitFor(() => {
      // Node count should reflect mocked nodes
      expect(screen.getByText(/nodes:/i)).toBeInTheDocument()
      expect(screen.getByText(/edges:/i)).toBeInTheDocument()
    })
  })
})
