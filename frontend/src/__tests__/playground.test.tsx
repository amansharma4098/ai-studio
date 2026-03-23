import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMutation } from '@tanstack/react-query'
import PlaygroundPage from '@/app/playground/page'
import { playgroundApi } from '@/lib/api'

describe('PlaygroundPage', () => {
  const mockMutate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
    })
  })

  it('renders model selector with llama3/mistral/gemma options', () => {
    render(<PlaygroundPage />)

    const select = screen.getByDisplayValue('Llama 3')
    expect(select).toBeInTheDocument()

    const options = select.querySelectorAll('option')
    const values = Array.from(options).map(o => o.getAttribute('value'))
    expect(values).toContain('llama3')
    expect(values).toContain('mistral')
    expect(values).toContain('gemma')
  })

  it('renders temperature slider (0 to 2)', () => {
    render(<PlaygroundPage />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '2')
    expect(slider).toHaveAttribute('step', '0.1')
  })

  it('renders prompt textarea with default value', () => {
    render(<PlaygroundPage />)

    const textarea = screen.getByDisplayValue(/list all security groups/i)
    expect(textarea).toBeInTheDocument()
  })

  it('renders system prompt textarea', () => {
    render(<PlaygroundPage />)

    expect(screen.getByDisplayValue(/helpful microsoft 365/i)).toBeInTheDocument()
  })

  it('submit button disabled when prompt is empty', async () => {
    const user = userEvent.setup()
    render(<PlaygroundPage />)

    // Clear the default prompt
    const promptTextarea = screen.getByDisplayValue(/list all security groups/i)
    await user.clear(promptTextarea)

    const runBtn = screen.getByRole('button', { name: /run prompt/i })
    expect(runBtn).toBeDisabled()
  })

  it('calls mutate on submit', async () => {
    const user = userEvent.setup()
    render(<PlaygroundPage />)

    const runBtn = screen.getByRole('button', { name: /run prompt/i })
    await user.click(runBtn)

    expect(mockMutate).toHaveBeenCalled()
  })

  it('shows loading text during API call', () => {
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isSuccess: false,
    })

    render(<PlaygroundPage />)

    expect(screen.getByText(/running/i)).toBeInTheDocument()
  })

  it('shows default response placeholder text', () => {
    render(<PlaygroundPage />)

    expect(screen.getByText(/response will appear here/i)).toBeInTheDocument()
  })

  it('shows querying text during pending state', () => {
    ;(useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isSuccess: false,
    })

    render(<PlaygroundPage />)

    expect(screen.getByText(/querying ollama/i)).toBeInTheDocument()
  })

  it('renders quick test prompt buttons', () => {
    render(<PlaygroundPage />)

    expect(screen.getByText('Entra: List Groups')).toBeInTheDocument()
    expect(screen.getByText('Azure: Cost Summary')).toBeInTheDocument()
    expect(screen.getByText('Cosmos DB Metrics')).toBeInTheDocument()
    expect(screen.getByText('VM Inventory')).toBeInTheDocument()
    expect(screen.getByText('Budget Status')).toBeInTheDocument()
  })

  it('clicking quick test fills prompt textarea', async () => {
    const user = userEvent.setup()
    render(<PlaygroundPage />)

    await user.click(screen.getByText('Azure: Cost Summary'))

    const textarea = screen.getByDisplayValue(/azure spend/i)
    expect(textarea).toBeInTheDocument()
  })

  it('renders execution log section', () => {
    render(<PlaygroundPage />)

    expect(screen.getByText('Execution Log')).toBeInTheDocument()
    expect(screen.getByText('Ollama endpoint')).toBeInTheDocument()
    // 'Model' appears both as an input label and in execution log
    expect(screen.getAllByText('Model').length).toBeGreaterThanOrEqual(1)
  })

  it('renders page heading', () => {
    render(<PlaygroundPage />)

    expect(screen.getByText('Playground')).toBeInTheDocument()
    expect(screen.getByText(/test prompts directly/i)).toBeInTheDocument()
  })

  it('changes model selection', async () => {
    const user = userEvent.setup()
    render(<PlaygroundPage />)

    const select = screen.getByDisplayValue('Llama 3')
    await user.selectOptions(select, 'mistral')

    expect((select as HTMLSelectElement).value).toBe('mistral')
  })
})
