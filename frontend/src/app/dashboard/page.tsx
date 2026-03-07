'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { agentsApi, monitoringApi, skillsApi, credentialsApi } from '@/lib/api'
import { Bot, Star, Key, Activity, Zap, ChevronRight } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 15000 })
  const { data: runs = [] } = useQuery({ queryKey: ['monitoring-runs'], queryFn: () => monitoringApi.runs(8).then(r => r.data), refetchInterval: 10000 })
  const { data: creds = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })

  const totalSkills = (catalog as any[]).reduce((a: number, c: any) => a + c.tags.reduce((b: number, t: any) => b + t.skills.length, 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.is_active).length
  const verifiedCreds = (creds as any[]).filter((c: any) => c.is_verified).length

  const statCards = [
    { label: 'Total Skills', value: totalSkills, sub: `${(catalog as any[]).length} categories`, color: 'text-violet-400', icon: Star, href: '/skills' },
    { label: 'Active Agents', value: activeAgents, sub: `${(agents as any[]).length} total`, color: 'text-emerald-400', icon: Bot, href: '/agents' },
    { label: 'Verified Creds', value: verifiedCreds, sub: `${(creds as any[]).length} configured`, color: 'text-blue-400', icon: Key, href: '/credentials' },
    { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '—', sub: `${stats?.total_runs ?? 0} total runs`, color: 'text-amber-400', icon: Activity, href: '/monitoring' },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">AI Studio · Microsoft Entra ID &amp; Azure Platform</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {statCards.map(s => (
          <button key={s.label} onClick={() => router.push(s.href)} className="rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5">
            <div className="mb-3 flex items-center justify-between">
              <s.icon size={16} className={s.color} />
              <ChevronRight size={13} className="text-muted-foreground/50" />
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value as any}</div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{s.label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Skill Categories */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Skill Categories</h2>
            <button onClick={() => router.push('/skills')} className="text-xs text-violet-400 hover:underline">View all →</button>
          </div>
          <div className="space-y-2">
            {(catalog as any[]).map((cat: any) => {
              const count = cat.tags.reduce((a: number, t: any) => a + t.skills.length, 0)
              return (
                <div key={cat.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-accent cursor-pointer transition-colors" onClick={() => router.push('/skills')}>
                  <span className="text-lg">{cat.icon}</span>
                  <span className="flex-1 text-[12.5px] font-medium">{cat.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{count} skills</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cat.credType === 'entra' ? 'bg-indigo-500/15 text-indigo-400' : cat.credType === 'azure' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {cat.credType === 'generic' ? 'open' : cat.credType}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Executions</h2>
            <button onClick={() => router.push('/monitoring')} className="text-xs text-violet-400 hover:underline">View all →</button>
          </div>
          <div className="space-y-2">
            {(runs as any[]).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No runs yet — <button className="text-violet-400 hover:underline" onClick={() => router.push('/agents')}>run an agent</button>
              </div>
            )}
            {(runs as any[]).map((run: any) => (
              <div key={run.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-accent cursor-pointer transition-colors" onClick={() => router.push('/monitoring')}>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${run.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : run.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{run.status}</span>
                <span className="text-[12px] font-medium min-w-[110px] truncate">{run.agent_name}</span>
                <span className="flex-1 truncate text-[11px] text-muted-foreground">{run.input_text}</span>
                <span className="font-mono text-[11px] text-amber-400 shrink-0">{run.execution_time_ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Quick Start</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '🏢', title: 'Add Entra Credential', sub: 'Connect Microsoft 365', href: '/credentials', color: 'border-indigo-500/25 hover:border-indigo-500/50' },
            { icon: '☁️', title: 'Add Azure Credential', sub: 'Connect Azure subscription', href: '/credentials', color: 'border-blue-500/25 hover:border-blue-500/50' },
            { icon: '🤖', title: 'Create Agent', sub: 'Attach skills + credentials', href: '/agents', color: 'border-violet-500/25 hover:border-violet-500/50' },
            { icon: '⚡', title: 'Try Playground', sub: 'Test any prompt directly', href: '/playground', color: 'border-amber-500/25 hover:border-amber-500/50' },
          ].map(a => (
            <button key={a.title} onClick={() => router.push(a.href)} className={`rounded-xl border ${a.color} p-4 text-left transition-all hover:bg-accent`}>
              <div className="mb-2 text-2xl">{a.icon}</div>
              <div className="text-[12.5px] font-semibold">{a.title}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
