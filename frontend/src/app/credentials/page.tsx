'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X, Loader2, RefreshCw, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { credentialsApi } from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────
interface FieldDef {
  key: string
  label: string
  type: 'text' | 'password'
  required: boolean
}

interface AuthTypeConfig {
  categories: string[]
  fields: FieldDef[]
}

interface Credential {
  id: string
  name: string
  auth_type: string
  auth_category: string
  description?: string
  created_by: string
  created_at: string
  modified_by: string
  modified_at: string
}

// ── Hardcoded Auth Types ─────────────────────────────────────────
const AUTH_TYPES: Record<string, AuthTypeConfig> = {
  'API Key': {
    categories: ['Groq', 'OpenAI', 'Anthropic', 'HubSpot', 'Salesforce', 'Custom'],
    fields: [
      { key: 'api_key', label: 'API KEY', type: 'password', required: true },
    ],
  },
  'OAuth2': {
    categories: ['Google', 'GitHub', 'Slack', 'Microsoft'],
    fields: [
      { key: 'client_id', label: 'CLIENT ID', type: 'text', required: true },
      { key: 'client_secret', label: 'CLIENT SECRET', type: 'password', required: true },
      { key: 'redirect_uri', label: 'REDIRECT URI', type: 'text', required: false },
    ],
  },
  'Basic Auth': {
    categories: ['Custom', 'Jenkins', 'Jira', 'Confluence'],
    fields: [
      { key: 'username', label: 'USERNAME', type: 'text', required: true },
      { key: 'password', label: 'PASSWORD', type: 'password', required: true },
    ],
  },
  'Bearer Token': {
    categories: ['Custom', 'REST API', 'Internal Service'],
    fields: [
      { key: 'token', label: 'BEARER TOKEN', type: 'password', required: true },
    ],
  },
  'Database': {
    categories: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    fields: [
      { key: 'connection_string', label: 'CONNECTION STRING', type: 'password', required: true },
      { key: 'host', label: 'HOST', type: 'text', required: false },
      { key: 'port', label: 'PORT', type: 'text', required: false },
      { key: 'username', label: 'USERNAME', type: 'text', required: false },
      { key: 'password', label: 'PASSWORD', type: 'password', required: false },
      { key: 'database', label: 'DATABASE NAME', type: 'text', required: false },
    ],
  },
  'AWS': {
    categories: ['AWS S3', 'AWS Lambda', 'AWS SES', 'AWS General'],
    fields: [
      { key: 'access_key_id', label: 'ACCESS KEY ID', type: 'text', required: true },
      { key: 'secret_access_key', label: 'SECRET ACCESS KEY', type: 'password', required: true },
      { key: 'region', label: 'REGION', type: 'text', required: true },
    ],
  },
  'SMTP': {
    categories: ['Gmail', 'SendGrid', 'Mailgun', 'Custom SMTP'],
    fields: [
      { key: 'host', label: 'SMTP HOST', type: 'text', required: true },
      { key: 'port', label: 'SMTP PORT', type: 'text', required: true },
      { key: 'username', label: 'USERNAME', type: 'text', required: true },
      { key: 'password', label: 'PASSWORD', type: 'password', required: true },
    ],
  },
  'Webhook': {
    categories: ['Slack', 'Discord', 'Teams', 'Custom'],
    fields: [
      { key: 'webhook_url', label: 'WEBHOOK URL', type: 'text', required: true },
      { key: 'secret', label: 'SIGNING SECRET', type: 'password', required: false },
    ],
  },
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

// ── Main Page ────────────────────────────────────────────────────
export default function CredentialsPage() {
  const qc = useQueryClient()
  const [mounted, setMounted] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal state
  const [addModal, setAddModal] = useState(false)
  const [viewModal, setViewModal] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Mounted guard
  useEffect(() => { setMounted(true) }, [])

  // ── Queries ──────────────────────────────────────────────────
  const { data: rawCredentials, isLoading, refetch } = useQuery({
    queryKey: ['credentials-list'],
    queryFn: () => credentialsApi.list().then(r => {
      const d = r.data
      return Array.isArray(d) ? d : []
    }),
    enabled: mounted,
  })

  const credentials: Credential[] = rawCredentials ?? []

  const filtered = (credentials ?? []).filter(c => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return true
    return false
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => credentialsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credentials-list'] }); setDeleteConfirm(null) },
  })

  const toggleAll = () => {
    if (selected.size === (filtered ?? []).length) setSelected(new Set())
    else setSelected(new Set((filtered ?? []).map(c => c.id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  if (!mounted) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Credentials</h1>
        <p className="mt-1 text-sm text-slate-500">Manage API keys and service connections</p>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} /> Refresh
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Credential Details ({(filtered ?? []).length})
          </span>
          <button
            type="button"
            onClick={() => { setEditId(null); setAddModal(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Add Credentials
          </button>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={(filtered ?? []).length > 0 && selected.size === (filtered ?? []).length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-10 px-2 py-3" />
                <th className="w-10 px-2 py-3" />
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Created Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Modified By</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Modified Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">View Credentials</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
                    <p className="mt-2 text-sm text-slate-400">Loading credentials...</p>
                  </td>
                </tr>
              )}
              {!isLoading && (filtered ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="text-4xl mb-2">🔑</div>
                    <p className="text-sm font-medium text-slate-500">No credentials yet</p>
                    <p className="mt-1 text-xs text-slate-400">Click &quot;Add Credentials&quot; to get started</p>
                  </td>
                </tr>
              )}
              {(filtered ?? []).map(cred => (
                <tr key={cred.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(cred.id)}
                      onChange={() => toggleOne(cred.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => { setEditId(cred.id); setAddModal(true) }}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(cred.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{cred.name}</td>
                  <td className="px-4 py-3 text-slate-600">{cred.created_by || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(cred.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{cred.modified_by || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(cred.modified_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setViewModal(cred.id)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:underline transition-colors"
                    >
                      View Credentials
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {addModal && (
        <AddEditModal
          editId={editId}
          credentials={credentials}
          onClose={() => { setAddModal(false); setEditId(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['credentials-list'] }); setAddModal(false); setEditId(null) }}
        />
      )}

      {/* View Modal */}
      {viewModal && (
        <ViewModal credId={viewModal} onClose={() => setViewModal(null)} />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete this credential?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone. The credential and its stored values will be permanently removed.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate(deleteConfirm)}
                disabled={deleteMut.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMut.isPending ? <><Loader2 size={13} className="animate-spin" /> Deleting...</> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ADD / EDIT MODAL
// ══════════════════════════════════════════════════════════════════
function AddEditModal({
  editId,
  credentials,
  onClose,
  onSaved,
}: {
  editId: string | null
  credentials: Credential[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!editId

  // Form state
  const [credName, setCredName] = useState('')
  const [selectedAuthType, setSelectedAuthType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [description, setDescription] = useState('')
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  // Derived
  const authConfig = selectedAuthType ? AUTH_TYPES[selectedAuthType] : null
  const fields: FieldDef[] = authConfig?.fields ?? []
  const categories: string[] = authConfig?.categories ?? []

  // Pre-fill on edit
  useEffect(() => {
    if (isEdit && editId) {
      const cred = (credentials ?? []).find(c => c.id === editId)
      if (cred) {
        setCredName(cred.name)
        setSelectedAuthType(cred.auth_type)
        setSelectedCategory(cred.auth_category)
        setDescription(cred.description || '')
      }
      credentialsApi.getValues(editId).then(r => {
        if (r.data && typeof r.data === 'object') {
          setCredentialValues(r.data)
        }
      }).catch(() => {})
    }
  }, [editId, isEdit, credentials])

  const saveMut = useMutation({
    mutationFn: (data: any) =>
      isEdit ? credentialsApi.update(editId!, data) : credentialsApi.save(data),
    onSuccess: () => onSaved(),
  })

  // Validation
  const requiredFieldsMissing = fields
    .filter(f => f.required)
    .some(f => !credentialValues[f.key]?.trim())

  const isValid =
    credName.trim() !== '' &&
    selectedAuthType !== '' &&
    selectedCategory !== '' &&
    !requiredFieldsMissing

  const handleSubmit = () => {
    setSubmitted(true)
    if (!isValid) return
    saveMut.mutate({
      name: credName,
      auth_type: selectedAuthType,
      auth_category: selectedCategory,
      description,
      credential_values: credentialValues,
    })
  }

  const togglePasswordVis = (key: string) =>
    setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  const inputBorderClass = (hasError: boolean) =>
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Edit Credential' : 'Add Credentials'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Row 1: Name (full width) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              NAME <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 ${inputBorderClass(submitted && !credName.trim())}`}
              placeholder="e.g. Production API Key"
              value={credName}
              onChange={e => setCredName(e.target.value)}
            />
          </div>

          {/* Row 2: Auth Type | Category (side by side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                AUTH TYPE <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-1 ${inputBorderClass(submitted && !selectedAuthType)}`}
                  value={selectedAuthType}
                  onChange={e => {
                    setSelectedAuthType(e.target.value)
                    setSelectedCategory('')
                    setCredentialValues({})
                  }}
                >
                  <option value="">Select auth type...</option>
                  {Object.keys(AUTH_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                CATEGORY <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400 ${inputBorderClass(submitted && !selectedCategory)}`}
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  disabled={!selectedAuthType}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Row 3: Description (full width) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                DESCRIPTION
              </label>
              <span className={`text-[10px] font-medium ${description.length > 255 ? 'text-red-500' : 'text-slate-400'}`}>
                {description.length}/255
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={255}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional description for this credential..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Row 4: Dynamic Credential Fields */}
          {selectedAuthType && fields.length > 0 && (
            <div className="space-y-4">
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  CREDENTIALS — {selectedAuthType}{selectedCategory ? ` / ${selectedCategory}` : ''}
                </p>
              </div>
              {fields.map(field => {
                const hasError = submitted && field.required && !credentialValues[field.key]?.trim()
                return (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 pr-10 ${inputBorderClass(hasError)}`}
                        type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={credentialValues[field.key] ?? ''}
                        onChange={e => setCredentialValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVis(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPasswords[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    {hasError && (
                      <p className="mt-1 text-[10px] text-red-500">This field is required</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveMut.isPending}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saveMut.isPending
              ? <><Loader2 size={13} className="animate-spin" /> {isEdit ? 'Updating...' : 'Saving...'}</>
              : isEdit ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// VIEW MODAL
// ══════════════════════════════════════════════════════════════════
function ViewModal({ credId, onClose }: { credId: string; onClose: () => void }) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  const { data: credValues, isLoading } = useQuery({
    queryKey: ['cred-values', credId],
    queryFn: () => credentialsApi.getValues(credId).then(r => r.data),
  })

  const { data: allCreds = [] } = useQuery<Credential[]>({
    queryKey: ['credentials-list'],
    queryFn: () => credentialsApi.list().then(r => {
      const d = r.data
      return Array.isArray(d) ? d : []
    }),
  })

  const cred = (allCreds ?? []).find((c: any) => c.id === credId)

  const togglePasswordVis = (key: string) =>
    setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  // Separate metadata from secret values
  const metaFields = ['auth_type', 'auth_category', 'description', 'created_by', 'created_at']
  const safeValues = credValues && typeof credValues === 'object' ? credValues : {}
  const secretEntries = Object.entries(safeValues).filter(([k]) => !metaFields.includes(k) && k !== 'id' && k !== 'name')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">View Credentials</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
              <p className="mt-2 text-sm text-slate-400">Loading...</p>
            </div>
          ) : (
            <>
              {/* Info fields */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                {[
                  ['Name', cred?.name || safeValues?.name || '—'],
                  ['Auth Type', cred?.auth_type || safeValues?.auth_type || '—'],
                  ['Category', cred?.auth_category || safeValues?.auth_category || '—'],
                  ['Description', cred?.description || safeValues?.description || '—'],
                  ['Created By', cred?.created_by || safeValues?.created_by || '—'],
                  ['Created At', cred?.created_at ? fmtDate(cred.created_at) : '—'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{(value as string) ?? '—'}</span>
                  </div>
                ))}
              </div>

              {/* Secret values */}
              {secretEntries.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Stored Values</p>
                  <div className="space-y-3">
                    {secretEntries.map(([key, val]) => {
                      const isPassword = key.toLowerCase().includes('secret') ||
                        key.toLowerCase().includes('password') ||
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('api_key') ||
                        key.toLowerCase().includes('key')
                      const show = showPasswords[key]
                      return (
                        <div key={key}>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <div className="relative">
                            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-mono pr-10">
                              {isPassword && !show
                                ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                                : (val as string) ?? '—'}
                            </div>
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVis(key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {show ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
