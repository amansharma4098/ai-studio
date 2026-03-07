'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ email: 'admin@contoso.com', name: '', organization: '', password: 'password123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    setLoading(true); setError('')
    try {
      const fn = tab === 'login' ? authApi.login(form.email, form.password) : authApi.signup(form)
      const { data } = await fn
      setAuth(data.user, data.access_token)
      router.push('/skills')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Authentication failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5"
      style={{ background: 'radial-gradient(ellipse at 60% 20%, rgba(109, 92, 231, 0.1) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-400 shadow-lg shadow-violet-500/40">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Studio</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Microsoft Entra ID & Azure Platform</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-5 flex rounded-lg bg-muted p-1">
            {(['login', 'signup'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Name</label>
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    placeholder="Alex Chen" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Organization</label>
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    placeholder="Contoso Ltd" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Email</label>
              <input type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
              <input type="password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>}
            <button onClick={handle} disabled={loading} className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
              {loading ? <><Loader2 size={14} className="animate-spin" />Authenticating...</> : tab === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">🔒 JWT auth · LLMs via Ollama · Entra OAuth2</p>
      </div>
    </div>
  )
}
