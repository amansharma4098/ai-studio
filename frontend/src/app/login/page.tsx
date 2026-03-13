'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ email: '', name: '', organization: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── dark branding side ────────────────────── */}
      <div
        className="hidden md:flex md:w-full lg:w-1/2 relative overflow-hidden flex-col items-center justify-center px-10 py-16 lg:py-0"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
      >
        {/* radial glow behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(16,185,129,0.2) 40%, transparent 70%)' }} />

        <div
          className={`relative z-10 max-w-md w-full flex flex-col items-center lg:items-start text-center lg:text-left transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
        >
          {/* Logo */}
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <Zap size={26} className="text-white" />
          </div>

          {/* Tagline */}
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Build AI Agents<br />That Actually Work
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Connect your tools, automate workflows, and deploy intelligent agents — no PhD required.
          </p>

          {/* Feature rows */}
          <div className="mt-10 space-y-5 w-full">
            {[
              { icon: '\u26A1', text: 'Run on Llama 3, Mistral & Gemma \u2014 free forever' },
              { icon: '\uD83D\uDD17', text: 'Connect 50+ tools with one click' },
              { icon: '\uD83E\uDD16', text: 'Multi-agent workflows in minutes' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-lg">{f.icon}</span>
                <span className="text-sm text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="mt-14 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['bg-emerald-500', 'bg-violet-500', 'bg-amber-500'].map((bg, i) => (
                <div key={i} className={`h-8 w-8 rounded-full ${bg} ring-2 ring-[#0f172a] flex items-center justify-center text-[11px] font-bold text-white`}>
                  {['A', 'K', 'R'][i]}
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500">Trusted by teams building the future</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── form side ────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-[#f8fafc] px-6 py-12 md:py-16 lg:py-0 min-h-screen lg:min-h-0">
        <div
          className={`w-full max-w-[400px] transition-all duration-700 ease-out delay-100 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
        >
          {/* Small logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">AI Studio</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {tab === 'login' ? 'Your AI development environment' : 'Get started with AI Studio'}
          </p>

          {/* Form */}
          <div className="mt-8 space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Alex Chen"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Organization</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Contoso Ltd"
                    value={form.organization}
                    onChange={e => setForm({ ...form, organization: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                {tab === 'login' && (
                  <button type="button" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-medium text-red-600">{error}</p>
            )}

            {/* Submit button */}
            <button
              onClick={handle}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Authenticating...</>
              ) : (
                tab === 'login' ? 'Sign In \u2192' : 'Create Account \u2192'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Toggle */}
            <p className="text-center text-sm text-slate-500">
              {tab === 'login' ? (
                <>Don&apos;t have an account?{' '}
                  <button onClick={() => { setTab('signup'); setError('') }} className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setTab('login'); setError('') }} className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
