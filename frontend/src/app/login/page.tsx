'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handle = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await authApi.login(form.email, form.password)
      localStorage.setItem('token', data.access_token)
      setAuth(data.user, data.access_token)
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Authentication failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Animated Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0f172a 100%)' }}>

        <style>{`
          @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(30px,-40px) scale(1.1)} 50%{transform:translate(-20px,-80px) scale(0.95)} 75%{transform:translate(40px,-30px) scale(1.05)} }
          @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-40px,30px) scale(1.08)} 66%{transform:translate(50px,-20px) scale(0.92)} }
          @keyframes float3 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(60px,40px)} 40%{transform:translate(-30px,70px)} 60%{transform:translate(40px,-50px)} 80%{transform:translate(-60px,-20px)} }
          @keyframes orbit { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
          @keyframes orbit2 { 0%{transform:rotate(0deg) translateX(80px) rotate(0deg)} 100%{transform:rotate(-360deg) translateX(80px) rotate(360deg)} }
          @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
          @keyframes dash { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
          @keyframes fadeSlide { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes gridPulse { 0%,100%{opacity:0.03} 50%{opacity:0.08} }
        `}</style>

        {/* Grid pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px', animation: 'gridPulse 8s ease-in-out infinite' }} />

        {/* Floating orbs */}
        <div className="absolute w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', top: '10%', left: '15%', animation: 'float1 12s ease-in-out infinite', filter: 'blur(40px)' }} />
        <div className="absolute w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', bottom: '5%', right: '10%', animation: 'float2 15s ease-in-out infinite', filter: 'blur(60px)' }} />
        <div className="absolute w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', top: '50%', left: '60%', animation: 'float3 18s ease-in-out infinite', filter: 'blur(30px)' }} />

        {/* Neural network SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" fill="none" style={{ opacity: 0.3 }}>
          {/* Connection lines */}
          <line x1="150" y1="120" x2="300" y2="200" stroke="#10b981" strokeWidth="0.8" strokeDasharray="6 4" style={{ animation: 'dash 8s linear infinite' }} />
          <line x1="300" y1="200" x2="380" y2="350" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="6 4" style={{ animation: 'dash 10s linear infinite' }} />
          <line x1="150" y1="120" x2="100" y2="300" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="6 4" style={{ animation: 'dash 12s linear infinite' }} />
          <line x1="100" y1="300" x2="300" y2="200" stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 6" style={{ animation: 'dash 9s linear infinite' }} />
          <line x1="300" y1="200" x2="200" y2="400" stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="4 6" style={{ animation: 'dash 11s linear infinite' }} />
          <line x1="380" y1="350" x2="200" y2="400" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 6" style={{ animation: 'dash 7s linear infinite' }} />

          {/* Nodes */}
          <circle cx="150" cy="120" r="5" fill="#10b981" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
          <circle cx="300" cy="200" r="6" fill="#6366f1" style={{ animation: 'pulse 4s ease-in-out infinite 0.5s' }} />
          <circle cx="380" cy="350" r="4" fill="#06b6d4" style={{ animation: 'pulse 3.5s ease-in-out infinite 1s' }} />
          <circle cx="100" cy="300" r="5" fill="#10b981" style={{ animation: 'pulse 4.5s ease-in-out infinite 1.5s' }} />
          <circle cx="200" cy="400" r="4" fill="#8b5cf6" style={{ animation: 'pulse 3s ease-in-out infinite 2s' }} />
        </svg>

        {/* Orbiting particles */}
        <div className="absolute" style={{ top: '45%', left: '45%' }}>
          <div style={{ animation: 'orbit 10s linear infinite' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 12px #10b981' }} />
          </div>
        </div>
        <div className="absolute" style={{ top: '45%', left: '45%' }}>
          <div style={{ animation: 'orbit2 8s linear infinite' }}>
            <div className="w-2 h-2 rounded-full bg-violet-400" style={{ boxShadow: '0 0 10px #8b5cf6' }} />
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center px-12" style={{ animation: 'fadeSlide 1s ease-out' }}>
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30">
              <Zap size={28} className="text-emerald-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">AI Studio</h2>
          <p className="text-emerald-200/70 text-base leading-relaxed max-w-xs mx-auto">
            Build, deploy, and orchestrate intelligent agents with enterprise-grade tooling
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              Agents
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-500" style={{ animation: 'pulse 2s ease-in-out infinite 0.5s' }} />
              Workflows
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500" style={{ animation: 'pulse 2s ease-in-out infinite 1s' }} />
              RAG
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel – Form */}
      <div className="flex flex-1 items-center justify-center px-4" style={{ background: '#f8fafc' }}>
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            {/* Logo – visible on mobile where left panel is hidden */}
            <div className="mb-6 flex items-center gap-2.5 justify-center lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <Zap size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800 tracking-tight">AI Studio</span>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-800">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Email address</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="auth-input pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handle()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                onClick={handle}
                disabled={loading}
                className="w-full rounded-lg py-[11px] text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600"
                style={{ height: '44px' }}
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-emerald-500 hover:text-emerald-600 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
