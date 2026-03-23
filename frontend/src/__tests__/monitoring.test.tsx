import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery } from '@tanstack/react-query'
import MonitoringPage from '@/app/monitoring/page'

describe('MonitoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function setupMocks(stats: any = null, runs: any[] = []) {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'monitoring-stats') return { data: stats }
      if (queryKey[0] === 'monitoring-runs') return { data: runs }
      return { data: undefined }
    })
  }

  it('renders stats cards (Success Rate, Avg Latency, Total Runs, Tokens Used)', () => {
    setupMocks({ success_rate: 95, avg_latency_ms: 200, total_runs: 50, total_tokens: 10000 })

    render(<MonitoringPage />)

    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Latency')).toBeInTheDocument()
    expect(screen.getByText('Total Runs')).toBeInTheDocument()
    expect(screen.getByText('Tokens Used')).toBeInTheDocument()
  })

  it('stats display correct numbers from API', () => {
    setupMocks({ success_rate: 92, avg_latency_ms: 350, total_runs: 120, total_tokens: 45000 })

    render(<MonitoringPage />)

    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('350ms')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('45.0K')).toBeInTheDocument()
  })

  it('shows dash when stats are not loaded', () => {
    setupMocks(null)

    render(<MonitoringPage />)

    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  it('renders runs table with columns', () => {
    setupMocks({ success_rate: 90, avg_latency_ms: 100, total_runs: 1, total_tokens: 500 }, [])

    render(<MonitoringPage />)

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Agent')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Skills Called')).toBeInTheDocument()
    expect(screen.getByText('Latency')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('shows run records from API', () => {
    setupMocks(
      { success_rate: 90, avg_latency_ms: 100, total_runs: 2, total_tokens: 1000 },
      [
        {
          id: 'r1',
          status: 'completed',
          agent_name: 'ReportBot',
          input_text: 'Generate daily report',
          skills_called: ['web_scraping', 'email'],
          execution_time_ms: 450,
          created_at: '2025-06-01T10:30:00Z',
          model_name: 'llama3',
          execution_trace: [],
        },
        {
          id: 'r2',
          status: 'failed',
          agent_name: 'DataBot',
          input_text: 'Query database',
          skills_called: ['sql_query'],
          execution_time_ms: 1200,
          created_at: '2025-06-01T11:00:00Z',
          model_name: 'mistral',
          execution_trace: [],
        },
      ]
    )

    render(<MonitoringPage />)

    expect(screen.getByText('ReportBot')).toBeInTheDocument()
    expect(screen.getByText('DataBot')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText('450ms')).toBeInTheDocument()
    expect(screen.getByText('1200ms')).toBeInTheDocument()
  })

  it('shows empty runs state', () => {
    setupMocks({ success_rate: 0, avg_latency_ms: 0, total_runs: 0, total_tokens: 0 }, [])

    render(<MonitoringPage />)

    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument()
  })

  it('shows skills called as code badges', () => {
    setupMocks(
      { success_rate: 90, avg_latency_ms: 100, total_runs: 1, total_tokens: 500 },
      [{
        id: 'r1',
        status: 'completed',
        agent_name: 'Bot',
        input_text: 'test',
        skills_called: ['web_scraping', 'email', 'sql_query'],
        execution_time_ms: 200,
        created_at: '2025-06-01T10:30:00Z',
        model_name: 'llama3',
        execution_trace: [],
      }]
    )

    render(<MonitoringPage />)

    expect(screen.getByText('web_scraping')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('sql_query')).toBeInTheDocument()
  })

  it('renders page heading and live indicator', () => {
    setupMocks(null)

    render(<MonitoringPage />)

    expect(screen.getByText('Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('renders execution log section', () => {
    setupMocks(null)

    render(<MonitoringPage />)

    expect(screen.getByText('Execution Log')).toBeInTheDocument()
    expect(screen.getByText(/click any row to expand/i)).toBeInTheDocument()
  })

  it('expands row on click to show execution trace', async () => {
    const user = userEvent.setup()
    setupMocks(
      { success_rate: 90, avg_latency_ms: 100, total_runs: 1, total_tokens: 500 },
      [{
        id: 'r1',
        status: 'completed',
        agent_name: 'Bot',
        input_text: 'test query',
        skills_called: [],
        execution_time_ms: 200,
        created_at: '2025-06-01T10:30:00Z',
        model_name: 'llama3',
        execution_trace: [{ step: 'LLM Call', input: { prompt: 'hello' }, output: 'world', status: 'ok' }],
        output_text: 'Final result here',
      }]
    )

    render(<MonitoringPage />)

    // Click the row
    await user.click(screen.getByText('Bot'))

    expect(screen.getByText('Execution Trace')).toBeInTheDocument()
    expect(screen.getByText('LLM Call')).toBeInTheDocument()
    expect(screen.getByText('Final Output')).toBeInTheDocument()
    expect(screen.getByText('Final result here')).toBeInTheDocument()
  })
})
