import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DocumentsPage from '@/app/documents/page'
import { documentsApi } from '@/lib/api'

const mockInvalidate = jest.fn()
const mockMutate = jest.fn()

describe('DocumentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: mockInvalidate })
  })

  function setupMocks(docs: any[] = []) {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'documents') return { data: docs, isLoading: false }
      return { data: undefined }
    })
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
    })
  }

  it('renders upload area with drag-drop hint', () => {
    setupMocks()
    render(<DocumentsPage />)

    expect(screen.getByText(/click to upload document/i)).toBeInTheDocument()
    expect(screen.getByText(/pdf, txt, md, docx, csv/i)).toBeInTheDocument()
  })

  it('has a hidden file input that accepts correct formats', () => {
    setupMocks()
    render(<DocumentsPage />)

    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('accept', '.pdf,.txt,.md,.docx,.csv')
  })

  it('shows document list from API', () => {
    setupMocks([
      { id: '1', file_name: 'report.pdf', chunk_count: 12, file_size: 51200, is_indexed: true },
      { id: '2', file_name: 'data.csv', chunk_count: 5, file_size: 10240, is_indexed: false },
    ])

    render(<DocumentsPage />)

    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText('data.csv')).toBeInTheDocument()
    expect(screen.getByText(/12 chunks/)).toBeInTheDocument()
    expect(screen.getByText(/50\.0 KB/)).toBeInTheDocument()
  })

  it('shows empty state when no documents', () => {
    setupMocks([])
    render(<DocumentsPage />)

    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument()
  })

  it('renders query section with model selector', () => {
    setupMocks()
    render(<DocumentsPage />)

    expect(screen.getByText('Ask Your Documents')).toBeInTheDocument()
    const select = screen.getByDisplayValue('Llama 3')
    expect(select).toBeInTheDocument()
  })

  it('query input visible with placeholder', () => {
    setupMocks([{ id: '1', file_name: 'doc.pdf', chunk_count: 1, file_size: 1024, is_indexed: true }])

    render(<DocumentsPage />)

    expect(screen.getByPlaceholderText(/what does this document say about/i)).toBeInTheDocument()
  })

  it('query button is disabled when question is empty', () => {
    setupMocks([{ id: '1', file_name: 'doc.pdf', chunk_count: 1, file_size: 1024, is_indexed: true }])

    render(<DocumentsPage />)

    const queryBtn = screen.getByRole('button', { name: /query documents/i })
    expect(queryBtn).toBeDisabled()
  })

  it('query button is disabled when no documents exist', () => {
    setupMocks([])

    render(<DocumentsPage />)

    const queryBtn = screen.getByRole('button', { name: /query documents/i })
    expect(queryBtn).toBeDisabled()
  })

  it('shows file name and metadata in list', () => {
    setupMocks([
      { id: '1', file_name: 'analysis.docx', chunk_count: 8, file_size: 20480, is_indexed: true },
    ])

    render(<DocumentsPage />)

    expect(screen.getByText('analysis.docx')).toBeInTheDocument()
    expect(screen.getByText(/8 chunks/)).toBeInTheDocument()
    expect(screen.getByText(/20\.0 KB/)).toBeInTheDocument()
    expect(screen.getByText('indexed')).toBeInTheDocument()
  })

  it('renders RAG pipeline visual', () => {
    setupMocks()
    render(<DocumentsPage />)

    expect(screen.getByText('RAG Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('ChromaDB')).toBeInTheDocument()
    expect(screen.getByText('Answer')).toBeInTheDocument()
  })

  it('renders page heading', () => {
    setupMocks()
    render(<DocumentsPage />)

    expect(screen.getByText('Document AI')).toBeInTheDocument()
  })

  it('shows indexed documents section header', () => {
    setupMocks()
    render(<DocumentsPage />)

    expect(screen.getByText('Indexed Documents')).toBeInTheDocument()
    expect(screen.getByText(/select documents to scope/i)).toBeInTheDocument()
  })

  it('shows selected docs count in query label', async () => {
    const user = userEvent.setup()
    setupMocks([
      { id: '1', file_name: 'doc1.pdf', chunk_count: 5, file_size: 1024, is_indexed: true },
      { id: '2', file_name: 'doc2.pdf', chunk_count: 3, file_size: 2048, is_indexed: true },
    ])

    render(<DocumentsPage />)

    // Click on the first document to select it
    await user.click(screen.getByText('doc1.pdf'))

    expect(screen.getByText(/1 docs selected/)).toBeInTheDocument()
  })
})
