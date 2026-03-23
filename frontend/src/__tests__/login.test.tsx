import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// Get mocked router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/login',
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders sign in button and signup link', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/sign up/i)).toBeInTheDocument()
  })

  it('shows error on failed login (401 response)', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockRejectedValue({
      response: { status: 401, data: { detail: 'Invalid credentials' } },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('shows generic error message when no detail in response', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockRejectedValue({
      response: { status: 500 },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })

  it('calls POST /auth/login with credentials on submit', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockResolvedValue({
      data: { access_token: 'tok123', user: { id: '1', name: 'Test', email: 'test@test.com' } },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'mypassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('test@test.com', 'mypassword')
    })
  })

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockResolvedValue({
      data: { access_token: 'tok123', user: { id: '1', name: 'Test', email: 'test@test.com' } },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'mypassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('stores token in localStorage on successful login', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockResolvedValue({
      data: { access_token: 'tok123', user: { id: '1', name: 'Test', email: 'test@test.com' } },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'mypassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('tok123')
    })
  })

  it('toggles password visibility on eye icon click', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click the eye toggle button (the button inside the password field container)
    const toggleBtn = passwordInput.parentElement!.querySelector('button')!
    await user.click(toggleBtn)

    expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await user.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('disables sign in button while loading', async () => {
    const user = userEvent.setup()
    let resolveLogin: (value: any) => void
    ;(authApi.login as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolveLogin = resolve })
    )

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })
  })

  it('submits form on Enter key in password field', async () => {
    const user = userEvent.setup()
    ;(authApi.login as jest.Mock).mockResolvedValue({
      data: { access_token: 'tok', user: { id: '1', name: 'T', email: 't@t.com' } },
    })

    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'mypass{enter}')

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('test@test.com', 'mypass')
    })
  })
})
