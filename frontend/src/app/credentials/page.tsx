'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronRight, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { credentialsApi } from '@/lib/api'

interface Credential {
  id: string; name: string; credential_type: string;
  is_verified: boolean; last_verified_at: string | null;
  scopes: string[]; created_at: string;
}

const TYPE_META = {
  azure: { label: 'Azure Management API', icon: '☁️', color: 'blue', scope: 'https://management.azure.com/.default' },
  entra: { label: 'Entra ID / Graph API', icon: '🏢', color: 'indigo', scope: 'https://graph.microsoft.com/.default' },
  both: { label: 'Azure + Entra (all scopes)', icon: '🔗', color: 'violet', scope: 'Both scopes' },
}

export default function CredentialsPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', credential_type: 'azure', tenant_id: '', client_id: '', client_secret: '', subscription_id: '' })
  const [verifying, setVerifying] = useState<string | null>(null)

  const { data: creds = [], isLoading } = useQuery<Credential[]>({
    queryKey: ['credentials'],
    queryFn: () => credentialsApi.list().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: credentialsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credentials'] }); setShowForm(false); resetForm() },
  })

  const verifyMut = useMutation({
    mutationFn: (id: string) => credentialsApi.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
    onSettled: () => setVerifying(null),
  })

  const deleteMut = useMutation({
    mutationFn: credentialsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
  })

  const resetForm = () => setForm({ name: '', credential_type: 'azure', tenant_id: '', client_id: '', client_secret: '', subscription_id: '' })

  const handleSubmit = () => {
    if (!form.name || !form.tenant_id || !form.client_id || !form.client_secret) return
    createMut.mutate(form)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Credentials</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Microsoft service principal credentials — encrypted with AES-128, injected at runtime
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
          <Plus size={13} /> Add Credential
        </button>
      </div>

      {/* Info boxes */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {[
          { icon: '🏢', title: 'Entra ID', body: 'App Registration with Graph API scope. Used for all Entra skills: groups, users, DLs.' },
          { icon: '☁️', title: 'Azure', body: 'Same App Registration with Management API scope. Assign Reader role on subscription.' },
        ].map(b => (
          <div key={b.title} className="flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs leading-relaxed">
            <span className="text-xl shrink-0">{b.icon}</span>
            <div><strong>{b.title}:</strong> {b.body}</div>
          </div>
        ))}
      </div>

      {/* Credential list */}
      {isLoading && <div className="py-20 text-center text-muted-foreground">Loading...</div>}
      <div className="space-y-2.5">
        {creds.map(cred => {
          const meta = TYPE_META[cred.credential_type as keyof typeof TYPE_META] || TYPE_META.azure
          const isExp = expanded === cred.id
          return (
            <div key={cred.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                className="flex cursor-pointer items-center gap-3 p-4"
                onClick={() => setExpanded(isExp ? null : cred.id)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xl">{meta.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold">{cred.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cred.credential_type === 'azure' ? 'bg-blue-500/15 text-blue-400' : cred.credential_type === 'entra' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-violet-500/15 text-violet-400'}`}>
                      {meta.label}
                    </span>
                    {cred.is_verified
                      ? <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"><CheckCircle size={9} /> Token Active</span>
                      : <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400"><AlertCircle size={9} /> Auth Failed</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {cred.last_verified_at ? `Token verified ${new Date(cred.last_verified_at).toLocaleString()}` : 'Not verified'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setVerifying(cred.id); verifyMut.mutate(cred.id) }}
                    disabled={verifying === cred.id}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={verifying === cred.id ? 'animate-spin' : ''} />
                    Re-auth
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteMut.mutate(cred.id) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {isExp ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </div>
              {isExp && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">OAuth2 Scopes</label>
                    <div className="flex gap-2 flex-wrap">
                      {cred.scopes?.map(s => (
                        <code key={s} className="rounded bg-violet-500/10 px-2 py-1 text-[11px] text-violet-400">{s}</code>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 text-[11px] font-mono text-muted-foreground">
                    Bearer Token: eyJhbGciOiJSUzI1Ni... <span className="rounded bg-emerald-500/10 px-1.5 text-emerald-400 font-sans">AES-128 encrypted</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    🔐 Credential data is encrypted at rest. The OAuth2 Bearer token is fetched fresh and injected into each skill's HTTP headers at runtime — the LLM model never sees the secret values.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Credential Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-base font-semibold">Add Microsoft Credential</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 leading-relaxed">
                ℹ️ Go to <strong>Azure Portal → Entra ID → App Registrations → New Registration</strong>. Under <strong>Certificates &amp; Secrets</strong>, add a Client Secret. Grant API permissions for Graph (Entra) or IAM roles (Azure).
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Credential Name</label>
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    placeholder="Contoso Azure Production" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(TYPE_META).map(([k, v]) => (
                      <button key={k} onClick={() => setForm({ ...form, credential_type: k })}
                        className={`rounded-lg border p-2.5 text-center transition-all ${form.credential_type === k ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-border/80'}`}>
                        <div className="text-lg mb-1">{v.icon}</div>
                        <div className={`text-[11px] font-semibold ${form.credential_type === k ? 'text-violet-400' : 'text-foreground'}`}>{k.toUpperCase()}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  { key: 'tenant_id', label: 'Tenant ID', hint: 'Entra ID → Overview → Tenant ID', ph: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                  { key: 'client_id', label: 'Client ID (Application ID)', hint: 'App Registration → Overview → Application ID', ph: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                  { key: 'client_secret', label: 'Client Secret', hint: 'App Registration → Certificates & Secrets → Value', ph: 'Your client secret value' },
                  ...(form.credential_type !== 'entra' ? [{ key: 'subscription_id', label: 'Subscription ID', hint: 'Azure Portal → Subscriptions', ph: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }] : []),
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{f.label}</label>
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      type={f.key === 'client_secret' ? 'password' : 'text'}
                      placeholder={f.ph}
                      value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    />
                    <p className="mt-1 text-[10.5px] text-muted-foreground">{f.hint}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={createMut.isPending}
                  className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  {createMut.isPending ? 'Verifying & Saving...' : 'Save & Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
