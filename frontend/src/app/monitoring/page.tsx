'use client'
import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { monitoringApi } from '@/lib/api'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function MonitoringPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 10000 })
  const { data: runs = [] } = useQuery({ queryKey: ['monitoring-runs'], queryFn: () => monitoringApi.runs(100).then(r => r.data), refetchInterval: 5000 })

  const STAT_CARDS = [
    { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '—', color: 'text-emerald-500' },
    { label: 'Avg Latency', value: stats ? `${Math.round(stats.avg_latency_ms)}ms` : '—', color: 'text-amber-600' },
    { label: 'Total Runs', value: stats?.total_runs ?? '—', color: 'text-slate-800' },
    { label: 'Tokens Used', value: stats?.total_tokens ? `${(stats.total_tokens / 1000).toFixed(1)}K` : '—', color: 'text-blue-600' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time agent execution traces and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${s.color}`}>{s.value as any}</p>
          </div>
        ))}
      </div>

      {/* Execution Log */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Execution Log</h2>
          <p className="text-xs text-slate-400">Click any row to expand the full LangChain execution trace</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Status', 'Agent', 'Input', 'Skills Called', 'Latency', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(runs as any[]).map((run: any) => (
                <Fragment key={run.id}>
                  <tr onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        run.status === 'failed' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{run.agent_name}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-500">{run.input_text}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(run.skills_called || []).slice(0, 3).map((s: string) => (
                          <code key={s} className="rounded bg-blue-50 px-1 py-0.5 text-[9.5px] text-blue-700">{s}</code>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-amber-600">{run.execution_time_ms}ms</td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(run.created_at).toLocaleTimeString()}
                      {expanded === run.id ? <ChevronDown size={12} className="inline ml-1" /> : <ChevronRight size={12} className="inline ml-1" />}
                    </td>
                  </tr>
                  {expanded === run.id && (
                    <tr key={run.id + '-trace'}>
                      <td colSpan={6} className="p-0">
                        <div className="border-t-2 border-emerald-500 bg-slate-50 p-5">
                          <div className="mb-3 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-emerald-600">Execution Trace</span>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{run.model_name}</span>
                          </div>
                          {(run.execution_trace || []).length === 0 && (
                            <p className="text-xs text-slate-400">No trace steps recorded</p>
                          )}
                          <div className="space-y-2 pl-1">
                            {(run.execution_trace || []).map((step: any, i: number) => (
                              <div key={i} className={`relative border-l-2 pl-4 py-1.5 ${step.status === 'ok' ? 'border-emerald-500' : 'border-red-500'}`}>
                                <div className={`absolute -left-[5px] top-2.5 h-2 w-2 rounded-full border ${step.status === 'ok' ? 'bg-emerald-500 border-emerald-500' : 'bg-red-500 border-red-500'}`} />
                                <p className="text-xs font-semibold text-slate-700">{step.step}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-slate-500 break-all">{JSON.stringify(step.input)}</p>
                                {step.output && <p className="mt-1 rounded bg-white border border-slate-200 p-1.5 font-mono text-[10.5px] text-slate-500">{step.output}</p>}
                              </div>
                            ))}
                          </div>
                          {run.output_text && (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Final Output</p>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-700">{run.output_text}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {(runs as any[]).length === 0 && (
            <div className="py-16 text-center text-slate-400 text-sm">No runs yet — run an agent to see traces here</div>
          )}
        </div>
      </div>
    </div>
  )
}
