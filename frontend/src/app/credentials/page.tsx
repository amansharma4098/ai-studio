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
    <div className="animate-fade-in" style={{ padding: '24px 32px', background: '#1c1d2b', minHeight: '100vh' }}>
      {/* ── Vault Header ───────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          {/* Shield / Lock Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))',
            border: '1px solid rgba(0,240,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(0,240,255,0.12)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <rect x="9" y="11" width="6" height="5" rx="1"/>
              <path d="M10 11V9a2 2 0 1 1 4 0v2"/>
            </svg>
          </div>
          <div>
            <h1 className="neon-text" style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1.2, textTransform: 'uppercase' }}>
              Vault
            </h1>
            <p style={{ fontSize: 13, color: '#8b92a8', letterSpacing: 0.5, marginTop: 2 }}>
              Secure credential storage &bull; Encrypted keys &amp; secrets
            </p>
          </div>
        </div>

        {/* Decorative scan-line bar */}
        <div style={{
          marginTop: 16, height: 2, borderRadius: 999,
          background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.4) 20%, rgba(139,92,246,0.4) 80%, transparent)',
        }} />
      </div>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'inactive'] as const).map(val => {
            const isActive = statusFilter === val
            const label = val === 'all' ? 'All Status' : val === 'active' ? 'Active' : 'Inactive'
            return (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val)}
                style={{
                  padding: '7px 18px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: isActive
                    ? val === 'active' ? 'rgba(0,255,136,0.12)'
                    : val === 'inactive' ? 'rgba(255,0,85,0.12)'
                    : 'rgba(0,240,255,0.1)'
                    : 'rgba(255,255,255,0.03)',
                  color: isActive
                    ? val === 'active' ? '#00ff88'
                    : val === 'inactive' ? '#ff4d6a'
                    : '#00f0ff'
                    : '#8b92a8',
                  border: `1px solid ${isActive
                    ? val === 'active' ? 'rgba(0,255,136,0.3)'
                    : val === 'inactive' ? 'rgba(255,0,85,0.3)'
                    : 'rgba(0,240,255,0.3)'
                    : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isActive
                    ? val === 'active' ? '0 0 12px rgba(0,255,136,0.1)'
                    : val === 'inactive' ? '0 0 12px rgba(255,0,85,0.1)'
                    : '0 0 12px rgba(0,240,255,0.1)'
                    : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className="game-btn-secondary"
          style={{ padding: '7px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => refetch()}
          className="game-btn-secondary"
          style={{ padding: '7px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={12} /> Refresh
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge-info" style={{ padding: '5px 14px', fontSize: 11, letterSpacing: 1 }}>
            ENTRIES: {(filtered ?? []).length}
          </span>
          <button
            type="button"
            onClick={() => { setEditId(null); setAddModal(true) }}
            className="game-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', fontSize: 12 }}
          >
            <Plus size={14} /> Add Credential
          </button>
        </div>
      </div>

      {/* ── Credentials Table ──────────────────────────────── */}
      <div className="game-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="game-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input
                    type="checkbox"
                    checked={(filtered ?? []).length > 0 && selected.size === (filtered ?? []).length}
                    onChange={toggleAll}
                    style={{
                      width: 16, height: 16, borderRadius: 4, cursor: 'pointer',
                      accentColor: '#00f0ff',
                    }}
                  />
                </th>
                <th style={{ width: 40, padding: '12px 8px' }} />
                <th style={{ width: 40, padding: '12px 8px' }} />
                <th>Name</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Created Date</th>
                <th>Modified By</th>
                <th>Modified Date</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto', color: '#00f0ff' }} />
                    <p style={{ marginTop: 10, fontSize: 13, color: '#8b92a8', letterSpacing: 0.5 }}>
                      Decrypting vault entries...
                    </p>
                  </td>
                </tr>
              )}
              {!isLoading && (filtered ?? []).length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
                      background: 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(139,92,246,0.08))',
                      border: '1px solid rgba(0,240,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <rect x="9" y="11" width="6" height="5" rx="1"/>
                        <path d="M10 11V9a2 2 0 1 1 4 0v2"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#eef0f6', letterSpacing: 0.5 }}>Vault is empty</p>
                    <p style={{ marginTop: 4, fontSize: 12, color: '#8b92a8' }}>
                      Click &quot;Add Credential&quot; to store your first secret
                    </p>
                  </td>
                </tr>
              )}
              {(filtered ?? []).map(cred => (
                <tr key={cred.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ paddingLeft: 16 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(cred.id)}
                      onChange={() => toggleOne(cred.id)}
                      style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', accentColor: '#00f0ff' }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      type="button"
                      onClick={() => { setEditId(cred.id); setAddModal(true) }}
                      title="Edit"
                      style={{
                        background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.12)',
                        borderRadius: 6, padding: 5, cursor: 'pointer', color: '#00f0ff',
                        transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,240,255,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(cred.id)}
                      title="Delete"
                      style={{
                        background: 'rgba(255,0,85,0.06)', border: '1px solid rgba(255,0,85,0.12)',
                        borderRadius: 6, padding: 5, cursor: 'pointer', color: '#ff4d6a',
                        transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.15)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,0,85,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <X size={13} />
                    </button>
                  </td>
                  <td style={{ fontWeight: 600, color: '#eef0f6', letterSpacing: 0.3 }}>{cred.name}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {/* Green glow dot for active */}
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: statusFilter === 'inactive' ? '#ff4d6a' : '#00ff88',
                        boxShadow: statusFilter === 'inactive'
                          ? '0 0 6px rgba(255,0,85,0.5), 0 0 12px rgba(255,0,85,0.2)'
                          : '0 0 6px rgba(0,255,136,0.5), 0 0 12px rgba(0,255,136,0.2)',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                      }} />
                      <span className={statusFilter === 'inactive' ? 'badge-danger' : 'badge-success'}>
                        {statusFilter === 'inactive' ? 'INACTIVE' : 'ACTIVE'}
                      </span>
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{cred.created_by || '—'}</td>
                  <td style={{ color: '#8b92a8', fontSize: 12 }}>{fmtDate(cred.created_at)}</td>
                  <td style={{ color: '#94a3b8' }}>{cred.modified_by || '—'}</td>
                  <td style={{ color: '#8b92a8', fontSize: 12 }}>{fmtDate(cred.modified_at)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setViewModal(cred.id)}
                      style={{
                        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                        borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                        color: '#a78bfa', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                        textTransform: 'uppercase', transition: 'all 0.3s',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(139,92,246,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <Eye size={12} /> Inspect
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

      {/* ── Delete Confirmation ────────────────────────────── */}
      {deleteConfirm && (
        <div className="game-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="game-modal animate-fade-in"
            style={{
              width: '100%', maxWidth: 420, padding: 0, margin: 16,
              border: '1px solid rgba(255,0,85,0.25)',
              boxShadow: '0 0 40px rgba(255,0,85,0.1), 0 0 80px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Red glow top bar */}
            <div style={{
              height: 3, borderRadius: '16px 16px 0 0',
              background: 'linear-gradient(90deg, transparent, #ff4d6a, #ff00aa, #ff4d6a, transparent)',
            }} />

            <div style={{ padding: '28px 28px 24px' }}>
              {/* Warning icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
                background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>

              <h3 style={{
                fontSize: 16, fontWeight: 700, color: '#ff4d6a', textAlign: 'center',
                marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                Purge Credential
              </h3>
              <p style={{
                fontSize: 13, color: '#8b92a8', textAlign: 'center', lineHeight: 1.5,
                marginBottom: 24,
              }}>
                This action cannot be undone. The credential and its stored values will be permanently removed from the vault.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="game-btn-secondary"
                  style={{ flex: 1, padding: '10px 0', textAlign: 'center', justifyContent: 'center', display: 'flex' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(deleteConfirm)}
                  disabled={deleteMut.isPending}
                  className="game-btn-danger"
                  style={{
                    flex: 1, padding: '10px 0', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}
                >
                  {deleteMut.isPending
                    ? <><Loader2 size={13} className="animate-spin" /> Purging...</>
                    : 'Confirm Purge'}
                </button>
              </div>
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

  const errorBorder = '1px solid rgba(255,0,85,0.5)'
  const normalBorder = '1px solid rgba(255,255,255,0.06)'
  const focusBorder = 'rgba(0,240,255,0.4)'

  // Auth type security level mapping for visual flair
  const securityLevels: Record<string, { color: string; label: string }> = {
    'API Key': { color: '#00f0ff', label: 'LEVEL 1' },
    'Bearer Token': { color: '#00f0ff', label: 'LEVEL 1' },
    'Basic Auth': { color: '#00ff88', label: 'LEVEL 2' },
    'OAuth2': { color: '#8b5cf6', label: 'LEVEL 3' },
    'Webhook': { color: '#8b5cf6', label: 'LEVEL 3' },
    'SMTP': { color: '#ff00aa', label: 'LEVEL 4' },
    'Database': { color: '#ff00aa', label: 'LEVEL 4' },
    'AWS': { color: '#ff6b35', label: 'LEVEL 5' },
  }

  return (
    <div className="game-modal-overlay" style={{ padding: 16 }} onClick={onClose}>
      <div
        className="game-modal animate-fade-in"
        style={{
          width: '100%', maxWidth: 640, padding: 0,
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{
          height: 3, borderRadius: '16px 16px 0 0',
          background: 'linear-gradient(90deg, transparent, #00f0ff, #8b5cf6, transparent)',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(139,92,246,0.1))',
              border: '1px solid rgba(0,240,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                {isEdit
                  ? <><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9a2 2 0 1 1 4 0v2"/></>
                  : <line x1="12" y1="9" x2="12" y2="15"/>}
                {!isEdit && <line x1="9" y1="12" x2="15" y2="12"/>}
              </svg>
            </div>
            <h2 className="neon-text" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              {isEdit ? 'Modify Vault Entry' : 'New Vault Entry'}
            </h2>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: 6, cursor: 'pointer', color: '#8b92a8',
              transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff4d6a'; e.currentTarget.style.borderColor = 'rgba(255,0,85,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b92a8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Name Field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: '#8b92a8', marginBottom: 8,
            }}>
              Credential Name <span style={{ color: '#ff4d6a' }}>*</span>
            </label>
            <input
              className="game-input"
              placeholder="e.g. Production API Key"
              value={credName}
              onChange={e => setCredName(e.target.value)}
              style={{
                border: submitted && !credName.trim() ? errorBorder : normalBorder,
              }}
              onFocus={e => { if (!(submitted && !credName.trim())) e.currentTarget.style.borderColor = focusBorder }}
              onBlur={e => { if (!(submitted && !credName.trim())) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            />
            {submitted && !credName.trim() && (
              <p style={{ marginTop: 4, fontSize: 10, color: '#ff4d6a', letterSpacing: 0.5 }}>Required field</p>
            )}
          </div>

          {/* Auth Type & Category - Security Level Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', color: '#8b92a8', marginBottom: 8,
              }}>
                Security Protocol <span style={{ color: '#ff4d6a' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="game-input"
                  value={selectedAuthType}
                  onChange={e => {
                    setSelectedAuthType(e.target.value)
                    setSelectedCategory('')
                    setCredentialValues({})
                  }}
                  style={{
                    appearance: 'none', paddingRight: 36, cursor: 'pointer',
                    border: submitted && !selectedAuthType ? errorBorder : normalBorder,
                  }}
                >
                  <option value="" style={{ background: '#0f0f18' }}>Select protocol...</option>
                  {Object.keys(AUTH_TYPES).map(type => (
                    <option key={type} value={type} style={{ background: '#0f0f18' }}>{type}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#00f0ff', pointerEvents: 'none',
                }} />
              </div>
              {/* Security level indicator */}
              {selectedAuthType && securityLevels[selectedAuthType] && (
                <div style={{
                  marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                  letterSpacing: 1.5,
                  background: `${securityLevels[selectedAuthType].color}15`,
                  color: securityLevels[selectedAuthType].color,
                  border: `1px solid ${securityLevels[selectedAuthType].color}30`,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: securityLevels[selectedAuthType].color,
                    boxShadow: `0 0 6px ${securityLevels[selectedAuthType].color}80`,
                  }} />
                  {securityLevels[selectedAuthType].label}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', color: '#8b92a8', marginBottom: 8,
              }}>
                Category <span style={{ color: '#ff4d6a' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="game-input"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  disabled={!selectedAuthType}
                  style={{
                    appearance: 'none', paddingRight: 36, cursor: selectedAuthType ? 'pointer' : 'not-allowed',
                    border: submitted && !selectedCategory ? errorBorder : normalBorder,
                    opacity: selectedAuthType ? 1 : 0.4,
                  }}
                >
                  <option value="" style={{ background: '#0f0f18' }}>Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} style={{ background: '#0f0f18' }}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#8b5cf6', pointerEvents: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', color: '#8b92a8',
              }}>
                Description
              </label>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: description.length > 255 ? '#ff4d6a' : '#6b7394',
              }}>
                {description.length}/255
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={255}
              className="game-input"
              placeholder="Optional description for this credential..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Dynamic Credential Fields */}
          {selectedAuthType && fields.length > 0 && (
            <div>
              {/* Section divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                paddingTop: 8,
              }}>
                <div style={{
                  flex: 1, height: 1,
                  background: 'linear-gradient(90deg, rgba(0,240,255,0.3), transparent)',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  color: '#00f0ff', whiteSpace: 'nowrap',
                }}>
                  Secret Fields — {selectedAuthType}{selectedCategory ? ` / ${selectedCategory}` : ''}
                </span>
                <div style={{
                  flex: 1, height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.3))',
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fields.map(field => {
                  const hasError = submitted && field.required && !credentialValues[field.key]?.trim()
                  return (
                    <div key={field.key}>
                      <label style={{
                        display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                        textTransform: 'uppercase', color: '#8b92a8', marginBottom: 8,
                      }}>
                        {field.label}
                        {field.required && <span style={{ color: '#ff4d6a', marginLeft: 3 }}>*</span>}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="game-input"
                          type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={credentialValues[field.key] ?? ''}
                          onChange={e => setCredentialValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          style={{
                            paddingRight: field.type === 'password' ? 44 : 14,
                            border: hasError ? errorBorder : normalBorder,
                            fontFamily: field.type === 'password' ? 'monospace' : 'inherit',
                          }}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVis(field.key)}
                            style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                              color: showPasswords[field.key] ? '#00f0ff' : '#6b7394',
                              transition: 'color 0.3s',
                              filter: showPasswords[field.key] ? 'drop-shadow(0 0 4px rgba(0,240,255,0.4))' : 'none',
                            }}
                          >
                            {showPasswords[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        )}
                      </div>
                      {hasError && (
                        <p style={{ marginTop: 4, fontSize: 10, color: '#ff4d6a', letterSpacing: 0.5 }}>This field is required</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button" onClick={onClose}
            className="game-btn-secondary"
            style={{ flex: 1, padding: '11px 0', textAlign: 'center', justifyContent: 'center', display: 'flex' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveMut.isPending}
            className="game-btn"
            style={{
              flex: 1, padding: '11px 0', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saveMut.isPending
              ? <><Loader2 size={13} className="animate-spin" /> {isEdit ? 'Encrypting...' : 'Sealing...'}</>
              : isEdit ? 'Update Entry' : 'Seal in Vault'}
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
    <div className="game-modal-overlay" style={{ padding: 16 }} onClick={onClose}>
      <div
        className="game-modal animate-fade-in"
        style={{
          width: '100%', maxWidth: 520, padding: 0,
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{
          height: 3, borderRadius: '16px 16px 0 0',
          background: 'linear-gradient(90deg, transparent, #8b5cf6, #00f0ff, transparent)',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,240,255,0.1))',
              border: '1px solid rgba(139,92,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Eye size={18} style={{ color: '#8b5cf6' }} />
            </div>
            <h2 style={{
              fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #8b5cf6, #00f0ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Credential Inspection
            </h2>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: 6, cursor: 'pointer', color: '#8b92a8',
              transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff4d6a'; e.currentTarget.style.borderColor = 'rgba(255,0,85,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b92a8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto', color: '#8b5cf6' }} />
              <p style={{ marginTop: 10, fontSize: 13, color: '#8b92a8', letterSpacing: 0.5 }}>
                Decrypting vault entry...
              </p>
            </div>
          ) : (
            <>
              {/* Info fields */}
              <div style={{
                borderRadius: 10, padding: 0, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                marginBottom: 24,
              }}>
                {[
                  ['Name', cred?.name || safeValues?.name || '—'],
                  ['Auth Type', cred?.auth_type || safeValues?.auth_type || '—'],
                  ['Category', cred?.auth_category || safeValues?.auth_category || '—'],
                  ['Description', cred?.description || safeValues?.description || '—'],
                  ['Created By', cred?.created_by || safeValues?.created_by || '—'],
                  ['Created At', cred?.created_at ? fmtDate(cred.created_at) : '—'],
                ].map(([label, value], idx, arr) => (
                  <div key={label as string} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 16px', fontSize: 13,
                    borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.2s',
                  }}>
                    <span style={{ color: '#8b92a8', fontWeight: 600, letterSpacing: 0.5, fontSize: 11, textTransform: 'uppercase' }}>
                      {label}
                    </span>
                    <span style={{
                      color: '#eef0f6', fontWeight: 500, textAlign: 'right',
                      maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {(value as string) ?? '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Secret values */}
              {secretEntries.length > 0 && (
                <div>
                  {/* Section divider */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                  }}>
                    <div style={{
                      flex: 1, height: 1,
                      background: 'linear-gradient(90deg, rgba(139,92,246,0.3), transparent)',
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                      color: '#8b5cf6', whiteSpace: 'nowrap',
                    }}>
                      Stored Secrets
                    </span>
                    <div style={{
                      flex: 1, height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3))',
                    }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {secretEntries.map(([key, val]) => {
                      const isPassword = key.toLowerCase().includes('secret') ||
                        key.toLowerCase().includes('password') ||
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('api_key') ||
                        key.toLowerCase().includes('key')
                      const show = showPasswords[key]
                      return (
                        <div key={key}>
                          <label style={{
                            display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                            textTransform: 'uppercase', color: '#8b92a8', marginBottom: 6,
                          }}>
                            {key.replace(/_/g, ' ')}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <div style={{
                              width: '100%', borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.06)',
                              background: 'rgba(15,15,24,0.8)',
                              padding: '10px 14px', paddingRight: isPassword ? 44 : 14,
                              fontSize: 13, fontFamily: 'monospace', color: '#eef0f6',
                              letterSpacing: isPassword && !show ? 4 : 0.5,
                            }}>
                              {isPassword && !show
                                ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                                : (val as string) ?? '—'}
                            </div>
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVis(key)}
                                style={{
                                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                                  color: show ? '#00f0ff' : '#6b7394',
                                  transition: 'color 0.3s',
                                  filter: show ? 'drop-shadow(0 0 4px rgba(0,240,255,0.4))' : 'none',
                                }}
                              >
                                {show ? <EyeOff size={15} /> : <Eye size={15} />}
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
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button" onClick={onClose}
            className="game-btn-secondary"
            style={{
              width: '100%', padding: '11px 0', textAlign: 'center',
              display: 'flex', justifyContent: 'center',
            }}
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  )
}
