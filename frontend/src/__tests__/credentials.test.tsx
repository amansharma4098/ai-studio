import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CredentialsPage from '@/app/credentials/page'
import { credentialsApi } from '@/lib/api'

const mockInvalidate = jest.fn()
const mockMutate = jest.fn()

describe('CredentialsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: mockInvalidate })
  })

  function setupMocks(creds: any[] = [], authTypes: any[] = []) {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'credentials-list') return { data: creds, isLoading: false, refetch: jest.fn() }
      if (queryKey[0] === 'auth-types') return { data: authTypes }
      if (queryKey[0] === 'cred-values') return { data: {} }
      return { data: undefined, isLoading: false, refetch: jest.fn() }
    })
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
    })
  }

  it('renders credentials table headers', () => {
    setupMocks()
    render(<CredentialsPage />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Created By')).toBeInTheDocument()
    expect(screen.getByText('Created Date')).toBeInTheDocument()
    expect(screen.getByText('Modified By')).toBeInTheDocument()
    expect(screen.getByText('Modified Date')).toBeInTheDocument()
    expect(screen.getByText('View Credentials')).toBeInTheDocument()
  })

  it('shows empty state when no credentials', () => {
    setupMocks([])
    render(<CredentialsPage />)

    expect(screen.getByText(/no credentials yet/i)).toBeInTheDocument()
  })

  it('shows credentials from API in table rows', () => {
    setupMocks([
      {
        id: '1',
        name: 'My API Key',
        auth_type: 'api_key',
        auth_category: 'default',
        description: 'Test key',
        created_by: 'admin',
        created_at: '2025-01-15T10:00:00Z',
        modified_by: 'editor',
        modified_at: '2025-01-15T12:00:00Z',
      },
    ])

    render(<CredentialsPage />)

    expect(screen.getByText('My API Key')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('editor')).toBeInTheDocument()
  })

  it('opens Add Credential modal on button click', async () => {
    const user = userEvent.setup()
    setupMocks([], [
      { id: 'api_key', name: 'API Key', categories: [{ id: 'default', name: 'Default', fields: [] }] },
    ])

    render(<CredentialsPage />)

    await user.click(screen.getByRole('button', { name: /add credentials/i }))

    await waitFor(() => {
      // Modal shows "Add Credentials" heading and NAME field
      expect(screen.getByPlaceholderText(/production api key/i)).toBeInTheDocument()
    })
  })

  it('renders page heading and filter bar', () => {
    setupMocks()
    render(<CredentialsPage />)

    expect(screen.getByText('Credentials')).toBeInTheDocument()
    expect(screen.getByText('Manage API keys and service connections')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('shows credential count badge', () => {
    setupMocks([
      { id: '1', name: 'Key1', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
      { id: '2', name: 'Key2', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
    ])

    render(<CredentialsPage />)

    expect(screen.getByText('Credential Details (2)')).toBeInTheDocument()
  })

  it('has status filter dropdown', () => {
    setupMocks()
    render(<CredentialsPage />)

    const select = screen.getByDisplayValue('All Status')
    expect(select).toBeInTheDocument()

    const options = select.querySelectorAll('option')
    const values = Array.from(options).map(o => o.getAttribute('value'))
    expect(values).toContain('all')
    expect(values).toContain('active')
    expect(values).toContain('inactive')
  })

  it('delete button shows confirmation dialog', async () => {
    const user = userEvent.setup()
    setupMocks([
      { id: '1', name: 'Key1', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
    ])

    render(<CredentialsPage />)

    // Click the X/delete button
    const deleteBtn = screen.getByTitle('Delete')
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(screen.getByText(/delete this credential/i)).toBeInTheDocument()
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument()
    })
  })

  it('has select all checkbox in table header', () => {
    setupMocks([
      { id: '1', name: 'Key1', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
    ])

    render(<CredentialsPage />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('renders View Credentials link for each row', () => {
    setupMocks([
      { id: '1', name: 'Key1', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
    ])

    render(<CredentialsPage />)

    expect(screen.getByText('View Credentials', { selector: 'button' })).toBeInTheDocument()
  })

  it('has edit button (pencil) for each credential row', () => {
    setupMocks([
      { id: '1', name: 'Key1', auth_type: 'a', auth_category: 'b', created_by: '', created_at: '', modified_by: '', modified_at: '' },
    ])

    render(<CredentialsPage />)

    expect(screen.getByTitle('Edit')).toBeInTheDocument()
  })
})
