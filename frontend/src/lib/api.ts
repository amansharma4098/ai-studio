import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.stupidaistudio.com'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Check simple token key first, then Zustand persist store
    let token = localStorage.getItem('token')
    if (!token) {
      const stored = localStorage.getItem('ai-studio-auth')
      if (stored) {
        try {
          const { state } = JSON.parse(stored)
          token = state?.token || null
        } catch {}
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
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
  signup: (data: { email: string; name: string; password: string; account_type?: string; org_name?: string | null }) =>
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
  getSkills: (id: string) => api.get(`/agents/${id}/skills`),
  addSkill: (id: string, data: any) => api.post(`/agents/${id}/skills`, data),
  removeSkill: (id: string, skillId: string) => api.delete(`/agents/${id}/skills/${skillId}`),
}

// ── Threads ──────────────────────────────────────────────────────
export const threadsApi = {
  listByAgent: (agentId: string) => api.get(`/agents/${agentId}/threads`),
  create: (agentId: string) => api.post(`/agents/${agentId}/threads`),
  getMessages: (threadId: string) => api.get(`/threads/${threadId}/messages`),
  chat: (threadId: string, message: string) =>
    api.post(`/threads/${threadId}/chat`, { input_text: message }),
  delete: (threadId: string) => api.delete(`/threads/${threadId}`),
}

// ── Skills ────────────────────────────────────────────────────────
export const skillsApi = {
  getCatalog: () => api.get('/skills/catalog'),
  list: () => api.get('/skills/'),
  mySkills: () => api.get('/skills/my-skills'),
  create: (data: any) => api.post('/skills/create', data),
  update: (id: string, data: any) => api.put(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
  test: (id: string, payload: any) => api.post(`/skills/${id}/test`, payload),
  install: (id: string) => api.post(`/skills/${id}/install`),
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
    stream?: boolean
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

// ── Agent Builder (NEW) ───────────────────────────────────────────
export const agentBuilderApi = {
  generate: (description: string) =>
    api.post('/agent-builder/generate', { description }),
  create: (description: string) =>
    api.post('/agent-builder/create', { description }),
  templates: () => api.get('/agent-builder/templates'),
  fromTemplate: (templateId: string) =>
    api.post('/agent-builder/from-template', null, { params: { template_id: templateId } }),
}

// ── Teams (NEW) ───────────────────────────────────────────────────
export const teamsApi = {
  list: () => api.get('/teams/'),
  get: (id: string) => api.get(`/teams/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/teams/', data),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data),
  invite: (teamId: string, data: { email: string; role: string }) =>
    api.post(`/teams/${teamId}/invite`, data),
  members: (teamId: string) => api.get(`/teams/${teamId}/members`),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
}

// ── API Keys (NEW) ────────────────────────────────────────────────
export const apiKeysApi = {
  list: () => api.get('/api-keys/'),
  create: (data: { name: string; scopes: string[]; expires_days?: number | null }) =>
    api.post('/api-keys/', data),
  scopes: () => api.get('/api-keys/scopes'),
  revoke: (id: string) => api.delete(`/api-keys/${id}`),
}

// ── Billing (NEW) ─────────────────────────────────────────────────
export const billingApi = {
  plans: () => api.get('/billing/plans'),
  myPlan: () => api.get('/billing/my-plan'),
  usage: () => api.get('/billing/usage'),
  upgrade: (planId: string, billingCycle?: string) =>
    api.post('/billing/upgrade', { plan_id: planId, billing_cycle: billingCycle || 'monthly' }),
}

// ── Audit (NEW) ───────────────────────────────────────────────────
export const auditApi = {
  list: (params?: { action?: string; resource_type?: string; limit?: number }) =>
    api.get('/audit/', { params }),
  stats: () => api.get('/audit/stats'),
}
