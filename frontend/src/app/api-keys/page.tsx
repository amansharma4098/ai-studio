'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, Check, Trash2, Loader2, Shield, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['agents:read', 'agents:execute'])
  const [expiresDays, setExpiresDays] = useState<string>('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys/').then(r => r.data),
  })

  const { data: availableScopes = [] } = useQuery({
    queryKey: ['api-key-scopes'],
    queryFn: () => api.get('/api-keys/scopes').then(r => r.data.scopes),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/api-keys/', {
      name,
      scopes,
      expires_days: expiresDays ? parseInt(expiresDays) : null,
    }).then(r => r.data),
    onSuccess: (data) => {
      setNewKey(data.full_key)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setName('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const toggleScope = (scope: string) => {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">API Keys</h1>
          <p className="mt-1 text-sm text-slate-500">Manage programmatic access to AI Studio</p>
        </div>
        <button onClick={() => { setShowCreate(true); setNewKey(null) }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus size={16} /> New API Key
        </button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-800">Save your API key now — it won't be shown again</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 p-3">
            <code className="flex-1 text-sm font-mono text-slate-700 break-all">{newKey}</code>
            <button onClick={copyKey} className="shrink-0 rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && !newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create API Key</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Production Backend" className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Scopes</label>
              <div className="grid grid-cols-2 gap-2">
                {(availableScopes as string[]).map(scope => (
                  <label key={scope} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} className="rounded text-emerald-600" />
                    <span className="text-[12px] font-mono text-slate-600">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Expires in (days)</label>
              <input value={expiresDays} onChange={e => setExpiresDays(e.target.value)} placeholder="Leave empty for no expiry" type="number" className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none" />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_120px_100px_60px] gap-4 px-5 py-3 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Name</span>
          <span>Key</span>
          <span>Scopes</span>
          <span>Status</span>
          <span></span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
        ) : (keys as any[]).length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No API keys yet</div>
        ) : (
          (keys as any[]).map((key: any) => (
            <div key={key.id} className="grid grid-cols-[1fr_180px_120px_100px_60px] gap-4 px-5 py-3 border-b border-slate-50 items-center hover:bg-slate-50">
              <span className="text-sm font-medium text-slate-700">{key.name}</span>
              <code className="text-[12px] font-mono text-slate-500">{key.key_prefix}...{'*'.repeat(16)}</code>
              <span className="text-[11px] text-slate-500">{key.scopes?.length || 0} scopes</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${key.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {key.is_active ? 'Active' : 'Revoked'}
              </span>
              <button
                onClick={() => revokeMutation.mutate(key.id)}
                disabled={!key.is_active}
                className="rounded p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Usage Example */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Start</h3>
        <pre className="rounded-lg bg-slate-900 p-4 text-[12px] text-emerald-400 overflow-x-auto">
{`curl -X POST https://api.yourdomain.com/api/agents/{agent_id}/run \\
  -H "Authorization: Bearer sk-aistudio-your-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{"input_text": "What are my Azure costs this month?"}'`}
        </pre>
      </div>
    </div>
  )
}
