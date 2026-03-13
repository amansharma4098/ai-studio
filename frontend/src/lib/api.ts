import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ai-studio-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ai-studio-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (data: { email: string; name: string; organization: string; password: string }) =>
    api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
}

// ── Agents ────────────────────────────────────────────────────────
export const agentsApi = {
  list: () => api.get('/agents/'),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents/', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  run: (id: string, inputText: string) =>
    api.post(`/agents/${id}/run`, { input_text: inputText }),
  getRuns: (id: string) => api.get(`/agents/${id}/runs`),
}

// ── Skills ────────────────────────────────────────────────────────
export const skillsApi = {
  getCatalog: () => api.get('/skills/catalog'),
  list: () => api.get('/skills/'),
}

// ── Credentials ───────────────────────────────────────────────────
export const credentialsApi = {
  getAuthTypes: () => api.get('/credentials/auth-types'),
  list: () => api.get('/credentials/list'),
  save: (data: any) => api.post('/credentials/save', data),
  update: (id: string, data: any) => api.put(`/credentials/${id}`, data),
  delete: (id: string) => api.delete(`/credentials/${id}`),
  getValues: (id: string) => api.get(`/credentials/${id}/values`),
}

// ── Documents ─────────────────────────────────────────────────────
export const documentsApi = {
  list: () => api.get('/documents/'),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  query: (question: string, documentIds?: string[], modelName?: string) =>
    api.post('/documents/query', { question, document_ids: documentIds, model_name: modelName }),
  delete: (id: string) => api.delete(`/documents/${id}`),
}

// ── Playground ────────────────────────────────────────────────────
export const playgroundApi = {
  run: (data: {
    prompt: string
    system_prompt?: string
    model_name?: string
    temperature?: number
    max_tokens?: number
  }) => api.post('/playground/run', data),
}

// ── Workflows ─────────────────────────────────────────────────────
export const workflowsApi = {
  list: () => api.get('/workflows/'),
  create: (data: any) => api.post('/workflows/', data),
  run: (id: string) => api.post(`/workflows/${id}/run`),
  delete: (id: string) => api.delete(`/workflows/${id}`),
}

// ── Monitoring ────────────────────────────────────────────────────
export const monitoringApi = {
  stats: () => api.get('/monitoring/stats'),
  runs: (limit?: number) => api.get(`/monitoring/runs?limit=${limit || 100}`),
}
