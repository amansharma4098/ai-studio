import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), forward: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/link - use createElement to avoid JSX in .ts file
jest.mock('next/link', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: (props: any) => React.createElement('a', { href: props.href }, props.children),
  }
})

// Mock API module
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  authApi: { login: jest.fn(), signup: jest.fn(), me: jest.fn() },
  agentsApi: { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), run: jest.fn(), getRuns: jest.fn(), getSkills: jest.fn(), addSkill: jest.fn(), removeSkill: jest.fn() },
  threadsApi: { listByAgent: jest.fn(), create: jest.fn(), getMessages: jest.fn(), chat: jest.fn(), delete: jest.fn() },
  skillsApi: { getCatalog: jest.fn(), list: jest.fn() },
  credentialsApi: { getAuthTypes: jest.fn(), list: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), getValues: jest.fn() },
  documentsApi: { list: jest.fn(), upload: jest.fn(), query: jest.fn(), delete: jest.fn() },
  playgroundApi: { run: jest.fn() },
  workflowsApi: { list: jest.fn(), create: jest.fn(), run: jest.fn(), delete: jest.fn() },
  monitoringApi: { stats: jest.fn(), runs: jest.fn() },
}))

// Mock zustand auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    jest.fn((selector?: any) => {
      const state = {
        user: null,
        token: null,
        setAuth: jest.fn(),
        logout: jest.fn(),
        isAuthenticated: jest.fn(() => false),
      }
      return selector ? selector(state) : state
    }),
    { getState: jest.fn(() => ({ user: null, token: null, isAuthenticated: () => false, setAuth: jest.fn(), logout: jest.fn() })) }
  ),
}))

// Mock react-query
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: jest.fn().mockReturnValue({ data: undefined, isLoading: false, refetch: jest.fn() }),
    useMutation: jest.fn().mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, isSuccess: false }),
    useQueryClient: jest.fn().mockReturnValue({ invalidateQueries: jest.fn() }),
  }
})

// Suppress React 18 act warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return
    if (typeof args[0] === 'string' && args[0].includes('ReactDOMTestUtils.act')) return
    originalError.call(console, ...args)
  }
})
afterAll(() => { console.error = originalError })
