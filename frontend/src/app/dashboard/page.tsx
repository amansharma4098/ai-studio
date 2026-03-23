'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { agentsApi, monitoringApi, skillsApi, credentialsApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Bot, Star, Key, Activity, ChevronRight } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token && !isAuthenticated()) {
      router.replace('/login')
    }
  }, [])

  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 15000 })
  const { data: runs = [] } = useQuery({ queryKey: ['monitoring-runs'], queryFn: () => monitoringApi.runs(8).then(r => r.data), refetchInterval: 10000 })
  const { data: creds = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })

  const totalSkills = (catalog as any[]).reduce((a: number, c: any) => a + c.tags.reduce((b: number, t: any) => b + t.skills.length, 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.is_active).length
  const verifiedCreds = (creds as any[]).filter((c: any) => c.is_verified).length

  const statCards = [
    { label: 'Total Skills', value: totalSkills, sub: `${(catalog as any[]).length} categories`, color: 'text-emerald-500', icon: Star, href: '/skills' },
    { label: 'Active Agents', value: activeAgents, sub: `${(agents as any[]).length} total`, color: 'text-slate-800', icon: Bot, href: '/agents' },
    { label: 'Verified Creds', value: verifiedCreds, sub: `${(creds as any[]).length} configured`, color: 'text-slate-800', icon: Key, href: '/credentials' },
    { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '—', sub: `${stats?.total_runs ?? 0} total runs`, color: 'text-emerald-500', icon: Activity, href: '/monitoring' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">AI Studio overview and quick actions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <button key={s.label} onClick={() => router.push(s.href)} className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-emerald-300 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <s.icon size={18} className="text-emerald-500" />
              <ChevronRight size={14} className="text-slate-300" />
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value as any}</div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Skill Categories */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Skill Categories</h2>
            <button onClick={() => router.push('/skills')} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">View all →</button>
          </div>
          <div className="space-y-2">
            {(catalog as any[]).map((cat: any) => {
              const count = cat.tags.reduce((a: number, t: any) => a + t.skills.length, 0)
              return (
                <div key={cat.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push('/skills')}>
                  <span className="text-lg">{cat.icon}</span>
                  <span className="flex-1 text-[13px] font-medium text-slate-700">{cat.name}</span>
                  <span className="text-[11px] font-medium text-slate-400">{count} skills</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    cat.credType === 'entra' ? 'bg-purple-100 text-purple-700' :
                    cat.credType === 'azure' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {cat.credType === 'generic' ? 'open' : cat.credType}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent Executions</h2>
            <button onClick={() => router.push('/monitoring')} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">View all →</button>
          </div>
          <div className="space-y-2">
            {(runs as any[]).length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No runs yet — <button className="text-emerald-500 hover:underline" onClick={() => router.push('/agents')}>run an agent</button>
              </div>
            )}
            {(runs as any[]).map((run: any) => (
              <div key={run.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push('/monitoring')}>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  run.status === 'failed' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-700'
                }`}>{run.status}</span>
                <span className="text-[12px] font-medium text-slate-700 min-w-[110px] truncate">{run.agent_name}</span>
                <span className="flex-1 truncate text-[11px] text-slate-400">{run.input_text}</span>
                <span className="font-mono text-[11px] text-amber-600 shrink-0">{run.execution_time_ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Quick Start</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🏢', title: 'Add Entra Credential', sub: 'Connect Microsoft 365', href: '/credentials' },
            { icon: '☁️', title: 'Add Azure Credential', sub: 'Connect Azure subscription', href: '/credentials' },
            { icon: '🤖', title: 'Create Agent', sub: 'Attach skills + credentials', href: '/agents' },
            { icon: '⚡', title: 'Try Playground', sub: 'Test any prompt directly', href: '/playground' },
          ].map(a => (
            <button key={a.title} onClick={() => router.push(a.href)} className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50">
              <div className="mb-2 text-2xl">{a.icon}</div>
              <div className="text-[13px] font-semibold text-slate-700">{a.title}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
