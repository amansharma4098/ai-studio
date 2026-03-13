'use client'
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react'
import { Key, Plus, Loader2 } from 'lucide-react'

class CredentialsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CredentialsPage] Error boundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">The credentials page encountered an error.</p>
            <button onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function getToken(): string {
  try {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('ai-studio-auth')
    if (!stored) return ''
    const parsed = JSON.parse(stored)
    return parsed?.state?.token || ''
  } catch {
    return ''
  }
}

export default function CredentialsPage() {
  return (
    <CredentialsErrorBoundary>
      <CredentialsPageInner />
    </CredentialsErrorBoundary>
  )
}

function CredentialsPageInner() {
  const [mounted, setMounted] = useState(false)
  const [credentials, setCredentials] = useState<any[]>([])
  const [authTypes, setAuthTypes] = useState<any>({ auth_types: [], categories: {}, fields: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', auth_type: '', auth_category: '', description: '' })
  const [dynamicFields, setDynamicFields] = useState<any[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const API = process.env.NEXT_PUBLIC_API_URL || ''

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted) fetchData()
  }, [mounted])

  if (!mounted) return null

  const getHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [credsRes, typesRes] = await Promise.all([
        fetch(`${API}/api/credentials/list`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API}/api/credentials/auth-types`, { headers: getHeaders() }).catch(() => null),
      ])
      if (credsRes?.ok) {
        const data = await credsRes.json()
        setCredentials(Array.isArray(data) ? data : [])
      }
      if (typesRes?.ok) {
        const data = await typesRes.json()
        setAuthTypes(data || { auth_types: [], categories: {}, fields: {} })
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleAuthTypeChange = (authType: string) => {
    const typeFields = authTypes?.fields?.[authType] || []
    // Find the category this auth_type belongs to
    let cat = ''
    for (const [category, types] of Object.entries(authTypes?.categories || {})) {
      if (Array.isArray(types) && types.includes(authType)) {
        cat = category
        break
      }
    }
    setForm(f => ({ ...f, auth_type: authType, auth_category: cat }))
    setDynamicFields(typeFields)
    setFieldValues({})
  }

  const handleSave = async () => {
    if (!form.name || !form.auth_type || !form.auth_category) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/credentials/save`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...form, credential_values: fieldValues }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.detail || `Save failed (${res.status})`)
      }
      setShowModal(false)
      setForm({ name: '', auth_type: '', auth_category: '', description: '' })
      setFieldValues({})
      setDynamicFields([])
      fetchData()
    } catch (e: any) {
      setError(e?.message || 'Failed to save credential')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return
    try {
      await fetch(`${API}/api/credentials/${id}`, { method: 'DELETE', headers: getHeaders() })
      fetchData()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">Credentials</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Connect your services — API keys are encrypted at rest</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
          <Plus size={13} /> Add Credential
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-xs underline hover:text-red-300">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Key size={32} className="mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No credentials yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Add your first credential to connect services</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500">
            Add Credential
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:table-cell">Auth Type</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground md:table-cell">Category</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(credentials ?? []).map((cred: any) => (
                <tr key={cred?.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{cred?.name || 'Untitled'}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{cred?.auth_type || '—'}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-violet-400">{cred?.auth_category || '—'}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-[12px] text-muted-foreground lg:table-cell">
                    {cred?.created_at ? new Date(cred.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(cred?.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Credential Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Add Credential</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">{'\u2715'}</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Name *</label>
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="My HubSpot Key"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Auth Type *</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  value={form.auth_type} onChange={e => handleAuthTypeChange(e.target.value)}>
                  <option value="">Select type...</option>
                  {(authTypes?.auth_types ?? []).map((t: string) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {form.auth_category && (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2 text-xs text-violet-400">
                  Category: <strong>{form.auth_category}</strong>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
                <textarea rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none"
                  placeholder="Optional description..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {dynamicFields.length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Connection Fields</p>
                  {(dynamicFields ?? []).map((field: any) => (
                    <div key={field?.key}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                        {field?.label || field?.key} {field?.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field?.type === 'password' ? 'password' : 'text'}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                        value={fieldValues[field?.key] || ''}
                        onChange={e => setFieldValues(v => ({ ...v, [field?.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.auth_type || !form.auth_category}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={13} className="animate-spin" />Saving...</> : 'Save Credential'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
