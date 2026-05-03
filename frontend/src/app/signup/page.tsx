'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Loader2, ArrowRight, Sparkles, User, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState<'individual' | 'organisation'>('individual')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) return
    setError('')
    setLoading(true)

    try {
      const { data } = await authApi.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        account_type: accountType,
        org_name: accountType === 'organisation' ? orgName.trim() : null,
      })
      setAuth(data.user, data.token)
      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#13141d' }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 70% 20%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(0,240,255,0.06) 0%, transparent 50%)',
      }} />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 animate-float" style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,240,255,0.2))',
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 0 30px rgba(139,92,246,0.15)',
          }}>
            <Sparkles size={28} style={{ color: '#8b5cf6' }} />
          </div>
          <h1 className="text-3xl font-black neon-text" style={{ letterSpacing: '2px' }}>AI STUDIO</h1>
          <p className="mt-2 text-sm" style={{ color: '#8b92a8' }}>Create your account</p>
        </div>

        {/* Signup Card */}
        <div className="rounded-2xl p-[1px]" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,240,255,0.1), rgba(255,0,170,0.1))',
        }}>
          <div className="rounded-2xl p-8" style={{ background: '#1c1d2b' }}>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{
                  background: 'rgba(255,77,106,0.1)',
                  border: '1px solid rgba(255,77,106,0.2)',
                  color: '#ff4d6a',
                }}>
                  {error}
                </div>
              )}

              {/* Account Type Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b92a8' }}>
                  Account Type
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAccountType('individual')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
                    style={accountType === 'individual'
                      ? { background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.3)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#8b92a8', border: '1px solid rgba(255,255,255,0.1)' }
                    }>
                    <User size={16} /> Individual
                  </button>
                  <button type="button" onClick={() => setAccountType('organisation')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
                    style={accountType === 'organisation'
                      ? { background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#8b92a8', border: '1px solid rgba(255,255,255,0.1)' }
                    }>
                    <Building2 size={16} /> Organisation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b92a8' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="game-input w-full"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {accountType === 'organisation' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b92a8' }}>
                    Organisation Name
                  </label>
                  <input
                    type="text"
                    className="game-input w-full"
                    placeholder="Your company or team name"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b92a8' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="game-input w-full"
                  placeholder="player@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b92a8' }}>
                  Password
                </label>
                <input
                  type="password"
                  className="game-input w-full"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim() || !password}
                className="game-btn w-full flex items-center justify-center gap-2"
                style={{ padding: '12px 24px', opacity: (loading || !name.trim() || !email.trim() || !password) ? 0.5 : 1 }}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                ) : (
                  <>Create Account <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: '#8b92a8' }}>
                Already have an account?{' '}
                <Link href="/login" className="font-bold transition-colors" style={{ color: '#00f0ff' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#8b5cf6')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#00f0ff')}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Skip auth link */}
        <div className="mt-4 text-center">
          <button onClick={() => router.push('/dashboard')}
            className="text-xs transition-colors" style={{ color: '#6b7394' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8b92a8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7394')}>
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  )
}
