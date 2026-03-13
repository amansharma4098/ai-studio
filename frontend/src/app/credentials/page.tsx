'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronDown, ChevronRight, Shield, Eye, EyeOff, Search } from 'lucide-react'
import { credentialsApi } from '@/lib/api'

interface CredentialRow {
  id: string
  name: string
  auth_type: string
  auth_category: string
  created_by_email: string
  created_at: string
  updated_at: string | null
  is_active: boolean
}

interface AuthTypesResponse {
  auth_types: string[]
  categories: Record<string, string[]>
  fields: Record<string, { key: string; label: string; type: string; required: boolean }[]>
}

const CATEGORY_ICONS: Record<string, string> = {
  'Cloud': '\u2601\uFE0F',
  'ITSM': '\uD83D\uDCCB',
  'Database': '\uD83D\uDDC4\uFE0F',
  'Monitoring': '\uD83D\uDCCA',
  'Analytics': '\uD83D\uDCC8',
  'API Key': '\uD83D\uDD11',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Cloud': 'bg-blue-500/15 text-blue-400',
  'ITSM': 'bg-amber-500/15 text-amber-400',
  'Database': 'bg-emerald-500/15 text-emerald-400',
  'Monitoring': 'bg-orange-500/15 text-orange-400',
  'Analytics': 'bg-purple-500/15 text-purple-400',
  'API Key': 'bg-violet-500/15 text-violet-400',
}

export default function CredentialsPage() {
  const [pageError, setPageError] = useState<string | null>(null)
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedAuthType, setSelectedAuthType] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // SSR guard
  if (typeof window === 'undefined') return null

  const { data: authTypesData, isError: authTypesError } = useQuery<AuthTypesResponse>({
    queryKey: ['credential-auth-types'],
    queryFn: async () => {
      try {
        const r = await credentialsApi.getAuthTypes()
        return r.data
      } catch {
        return { auth_types: [], categories: {}, fields: {} }
      }
    },
  })

  const authTypes = authTypesData?.auth_types ?? []
  const categories = authTypesData?.categories ?? {}
  const fields = authTypesData?.fields ?? {}

  const { data: creds = [], isLoading, isError: credsError } = useQuery<CredentialRow[]>({
    queryKey: ['credentials'],
    queryFn: async () => {
      try {
        const r = await credentialsApi.list()
        return Array.isArray(r.data) ? r.data : []
      } catch {
        return []
      }
    },
  })

  const saveMut = useMutation({
    mutationFn: (data: any) => credentialsApi.save(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] })
      closeForm()
    },
    onError: (e: any) => {
      setPageError(e?.response?.data?.detail || 'Failed to save credential')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => credentialsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
  })

  const closeForm = () => {
    setShowForm(false)
    setSelectedCategory(null)
    setSelectedAuthType(null)
    setFormName('')
    setFormDescription('')
    setFormValues({})
    setShowSecrets({})
  }

  const handleSelectAuthType = (authType: string) => {
    setSelectedAuthType(authType)
    const cat = Object.entries(categories).find(([, types]) => (types ?? []).includes(authType))
    if (cat) setSelectedCategory(cat[0])
    // Reset form values for this auth type
    const typeFields = fields[authType] ?? []
    const defaults: Record<string, string> = {}
    typeFields.forEach(f => { defaults[f.key] = '' })
    setFormValues(defaults)
  }

  const handleSubmit = () => {
    if (!selectedAuthType || !formName) return
    const categoryForType = Object.entries(categories).find(([, types]) => (types ?? []).includes(selectedAuthType))
    saveMut.mutate({
      name: formName,
      auth_type: selectedAuthType,
      auth_category: categoryForType?.[0] ?? '',
      description: formDescription || null,
      credential_values: formValues,
    })
  }

  const filteredCreds = (creds ?? []).filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (c.name ?? '').toLowerCase().includes(q)
      || (c.auth_type ?? '').toLowerCase().includes(q)
      || (c.auth_category ?? '').toLowerCase().includes(q)
  })

  if (pageError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm text-red-400">Error: {pageError}</p>
          <button onClick={() => setPageError(null)} className="mt-3 text-xs text-red-400 underline hover:text-red-300">Dismiss</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Credentials</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Encrypted credential storage for all integrations — AES-128 at rest, injected at runtime
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus size={13} /> Add Credential
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Search credentials by name, type, or category..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category summary pills */}
      {Object.keys(categories).length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.entries(categories).map(([cat, types]) => {
            const count = (creds ?? []).filter(c => c.auth_category === cat).length
            return (
              <span key={cat} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${CATEGORY_COLORS[cat] ?? 'bg-slate-500/15 text-slate-400'}`}>
                {CATEGORY_ICONS[cat] ?? '\uD83D\uDD27'} {cat} <span className="opacity-60">({count})</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Credential list */}
      {isLoading && <div className="py-20 text-center text-muted-foreground">Loading credentials...</div>}

      {!isLoading && (filteredCreds ?? []).length === 0 && (
        <div className="py-20 text-center">
          <Shield size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No credentials yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first integration credential to get started</p>
        </div>
      )}

      <div className="space-y-2.5">
        {(filteredCreds ?? []).map(cred => {
          const catColor = CATEGORY_COLORS[cred?.auth_category] ?? 'bg-slate-500/15 text-slate-400'
          const catIcon = CATEGORY_ICONS[cred?.auth_category] ?? '\uD83D\uDD27'
          const isExp = expanded === cred?.id
          return (
            <div key={cred?.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                className="flex cursor-pointer items-center gap-3 p-4"
                onClick={() => setExpanded(isExp ? null : cred?.id)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xl">
                  {catIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold truncate">{cred?.name ?? 'Untitled'}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${catColor}`}>
                      {cred?.auth_type ?? 'Unknown'}
                    </span>
                    <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {cred?.auth_category ?? ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Created {cred?.created_at ? new Date(cred.created_at).toLocaleDateString() : 'unknown'}
                    {cred?.created_by_email ? ` by ${cred.created_by_email}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); deleteMut.mutate(cred?.id) }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                  {isExp ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </div>
              {isExp && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Auth Type</span>
                      <span className="font-medium">{cred?.auth_type ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</span>
                      <span className="font-medium">{cred?.auth_category ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</span>
                      <span className="font-medium text-emerald-400">Active</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Updated</span>
                      <span className="font-medium">{cred?.updated_at ? new Date(cred.updated_at).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 text-[11px] text-muted-foreground">
                    <Shield size={12} className="inline mr-1.5" />
                    Credential values are Fernet-encrypted at rest. Decrypted only at agent execution time.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Credential Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={closeForm}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-base font-semibold">
                {selectedAuthType ? `Add ${selectedAuthType} Credential` : 'Add Credential'}
              </h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground text-lg">{'\u2715'}</button>
            </div>
            <div className="p-5 space-y-4">

              {/* Step 1: Pick auth type */}
              {!selectedAuthType ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Select an integration type:</p>
                  {Object.entries(categories).map(([cat, types]) => (
                    <div key={cat}>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        {CATEGORY_ICONS[cat] ?? ''} {cat}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {(types ?? []).map(authType => (
                          <button
                            key={authType}
                            onClick={() => handleSelectAuthType(authType)}
                            className="rounded-lg border border-border p-3 text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                          >
                            <span className="text-sm font-medium">{authType}</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {(fields[authType] ?? []).length} fields
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Step 2: Fill in fields */
                <div className="space-y-3">
                  <button
                    onClick={() => { setSelectedAuthType(null); setSelectedCategory(null) }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 mb-1"
                  >
                    {'\u2190'} Back to type selection
                  </button>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Credential Name</label>
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder={`My ${selectedAuthType} credential`}
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Description (optional)</label>
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="e.g. Production environment"
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                    />
                  </div>

                  {(fields[selectedAuthType] ?? []).map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                          placeholder={field.label}
                          value={formValues[field.key] ?? ''}
                          onChange={e => setFormValues({ ...formValues, [field.key]: e.target.value })}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button onClick={closeForm} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={saveMut.isPending || !formName}
                      className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      {saveMut.isPending ? 'Saving...' : 'Save Credential'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
