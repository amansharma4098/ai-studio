'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { agentsApi, monitoringApi, skillsApi, credentialsApi, api } from '@/lib/api'
import { Bot, Star, Key, Activity, ChevronRight, Wand2, Users, CreditCard, Zap, KeyRound } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()

  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 15000 })
  const { data: runs = [] } = useQuery({ queryKey: ['monitoring-runs'], queryFn: () => monitoringApi.runs(8).then(r => r.data), refetchInterval: 10000 })
  const { data: creds = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })
  const { data: usage } = useQuery({ queryKey: ['billing-usage'], queryFn: () => api.get('/billing/usage').then(r => r.data).catch(() => null) })

  const totalSkills = (catalog as any[]).reduce((a: number, c: any) => a + c.tags.reduce((b: number, t: any) => b + t.skills.length, 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.is_active).length
  const verifiedCreds = (creds as any[]).filter((c: any) => c.is_verified).length

  const statCards = [
    { label: 'Total Skills', value: totalSkills, sub: `${(catalog as any[]).length} categories`, color: '#00ff88', icon: Star, href: '/skills' },
    { label: 'Active Agents', value: activeAgents, sub: `${(agents as any[]).length} total`, color: '#00f0ff', icon: Bot, href: '/agents' },
    { label: 'Verified Creds', value: verifiedCreds, sub: `${(creds as any[]).length} configured`, color: '#8b5cf6', icon: Key, href: '/credentials' },
    { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '\u2014', sub: `${stats?.total_runs ?? 0} total runs`, color: '#00ff88', icon: Activity, href: '/monitoring' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in" style={{ background: '#0a0a0f', minHeight: '100vh' }}>

      {/* Page Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text" style={{ letterSpacing: '0.5px' }}>Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>AI Studio v5 -- Multi-Model (Claude, GPT, Gemini, Llama)</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
          >
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.6)' }}
            />
            <span className="text-xs font-medium" style={{ color: '#00ff88' }}>Multi-Model Active</span>
          </div>
        </div>
      </div>

      {/* Smart Agent Builder CTA - Featured Quest Banner */}
      <div
        className="mb-6 relative overflow-hidden"
        style={{
          borderRadius: '16px',
          padding: '2px',
          background: 'linear-gradient(135deg, #8b5cf6, #00f0ff, #ff00aa, #8b5cf6)',
          backgroundSize: '300% 300%',
          animation: 'border-flow 4s ease infinite',
        }}
      >
        <div
          className="relative rounded-[14px] p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,240,255,0.08), rgba(18,18,26,0.95))',
          }}
        >
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 rounded-[14px] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl animate-float"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,240,255,0.2))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 20px rgba(139,92,246,0.2)',
                }}
              >
                <Wand2 size={24} style={{ color: '#00f0ff' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold neon-text">Smart Agent Builder</h2>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(255,0,170,0.15)',
                      color: '#ff00aa',
                      border: '1px solid rgba(255,0,170,0.3)',
                    }}
                  >Featured Quest</span>
                </div>
                <p className="text-sm" style={{ color: '#64748b' }}>Describe what you need in plain English. Claude builds the agent for you.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/agent-builder')}
              className="game-btn flex items-center gap-2 shrink-0"
            >
              <Wand2 size={16} /> Build an Agent
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards - HUD Style */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, idx) => (
          <button
            key={s.label}
            onClick={() => router.push(s.href)}
            className="hud-stat text-left transition-all hover:scale-[1.02] group"
            style={{
              cursor: 'pointer',
              animationDelay: `${idx * 0.08}s`,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <s.icon size={18} style={{ color: s.color, filter: `drop-shadow(0 0 6px ${s.color}60)` }} />
              <ChevronRight size={14} style={{ color: '#64748b' }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-3xl font-bold" style={{ color: s.color, textShadow: `0 0 20px ${s.color}30` }}>
              {s.value as any}
            </div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{s.label}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: '#475569' }}>{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Skill Categories - Loadout Panel */}
        <div className="game-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              <span style={{ color: '#8b5cf6', marginRight: '6px' }}>//</span>
              Skill Categories
            </h2>
            <button
              onClick={() => router.push('/skills')}
              className="game-btn-secondary text-xs"
              style={{ padding: '4px 12px', fontSize: '11px' }}
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {(catalog as any[]).map((cat: any) => {
              const count = cat.tags.reduce((a: number, t: any) => a + t.skills.length, 0)
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-all"
                  style={{
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,240,255,0.04)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,240,255,0.15)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                  onClick={() => router.push('/skills')}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: '#e2e8f0' }}>{cat.name}</span>
                  <span className="text-[11px] font-medium" style={{ color: '#64748b' }}>{count} skills</span>
                  <span className={
                    cat.credType === 'entra' ? 'badge-purple' :
                    cat.credType === 'azure' ? 'badge-info' :
                    'badge-success'
                  }>
                    {cat.credType === 'generic' ? 'open' : cat.credType}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Runs - Mission Log */}
        <div className="game-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              <span style={{ color: '#00f0ff', marginRight: '6px' }}>//</span>
              Mission Log
            </h2>
            <button
              onClick={() => router.push('/monitoring')}
              className="game-btn-secondary text-xs"
              style={{ padding: '4px 12px', fontSize: '11px' }}
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {(runs as any[]).length === 0 && (
              <div className="py-8 text-center text-sm" style={{ color: '#64748b' }}>
                No missions yet --{' '}
                <button
                  style={{ color: '#00f0ff' }}
                  className="hover:underline"
                  onClick={() => router.push('/agents')}
                >
                  deploy an agent
                </button>
              </div>
            )}
            {(runs as any[]).map((run: any, idx: number) => (
              <div
                key={run.id}
                className="flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  animationDelay: `${idx * 0.05}s`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,240,255,0.04)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,240,255,0.15)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                }}
                onClick={() => router.push('/monitoring')}
              >
                <span className={
                  run.status === 'completed' ? 'badge-success' :
                  run.status === 'failed' ? 'badge-danger' :
                  'badge-info'
                } style={{ fontSize: '10px', fontWeight: 700 }}>
                  {run.status}
                </span>
                <span className="text-[12px] font-medium min-w-[110px] truncate" style={{ color: '#e2e8f0' }}>{run.agent_name}</span>
                <span className="flex-1 truncate text-[11px]" style={{ color: '#64748b' }}>{run.input_text}</span>
                <span
                  className="font-mono text-[11px] shrink-0"
                  style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0,240,255,0.3)' }}
                >
                  {run.execution_time_ms}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions - Action Cards */}
      <div className="game-card p-5">
        <h2 className="mb-4 text-sm font-semibold" style={{ color: '#e2e8f0' }}>
          <span style={{ color: '#ff00aa', marginRight: '6px' }}>//</span>
          Quick Start
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Wand2, title: 'Smart Builder', sub: 'Describe \u2192 Agent', href: '/agent-builder', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
            { icon: Bot, title: 'Create Agent', sub: 'Manual configuration', href: '/agents', accent: '#00ff88', glow: 'rgba(0,255,136,0.15)' },
            { icon: Users, title: 'Create Team', sub: 'Collaborate together', href: '/teams', accent: '#00f0ff', glow: 'rgba(0,240,255,0.15)' },
            { icon: KeyRound, title: 'API Access', sub: 'Generate API key', href: '/api-keys', accent: '#ff00aa', glow: 'rgba(255,0,170,0.15)' },
          ].map(a => (
            <button
              key={a.title}
              onClick={() => router.push(a.href)}
              className="rounded-xl p-4 text-left transition-all group"
              style={{
                background: `linear-gradient(135deg, ${a.glow}, transparent)`,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${a.accent}40`
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${a.glow}, 0 0 40px ${a.glow.replace('0.15', '0.05')}`
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <a.icon size={24} className="mb-2" style={{ color: a.accent, filter: `drop-shadow(0 0 6px ${a.accent}60)` }} />
              <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{a.title}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: '#64748b' }}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Usage Banner - XP Progress */}
      {usage && (
        <div className="mt-5 game-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              <span style={{ color: '#00ff88', marginRight: '6px' }}>//</span>
              Usage This Month
            </h2>
            <button
              onClick={() => router.push('/billing')}
              className="game-btn-secondary text-xs"
              style={{ padding: '4px 12px', fontSize: '11px' }}
            >
              Manage plan
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Agents</div>
              <div className="text-lg font-bold" style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.3)' }}>
                {usage.agents_used}
                <span className="text-sm font-normal" style={{ color: '#64748b' }}>
                  /{usage.agents_limit === -1 ? '\u221E' : usage.agents_limit}
                </span>
              </div>
              {usage.agents_limit !== -1 && (
                <div className="mt-2 xp-bar">
                  <div
                    className="xp-bar-fill"
                    style={{ width: `${Math.min((usage.agents_used / usage.agents_limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Runs</div>
              <div className="text-lg font-bold" style={{ color: '#8b5cf6', textShadow: '0 0 12px rgba(139,92,246,0.3)' }}>
                {usage.runs_this_month}
                <span className="text-sm font-normal" style={{ color: '#64748b' }}>
                  /{usage.runs_limit === -1 ? '\u221E' : usage.runs_limit}
                </span>
              </div>
              {usage.runs_limit !== -1 && (
                <div className="mt-2 xp-bar">
                  <div
                    className="xp-bar-fill green"
                    style={{ width: `${Math.min((usage.runs_this_month / usage.runs_limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Est. Cost</div>
              <div className="text-lg font-bold neon-text-green">
                ${usage.estimated_cost_usd?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
