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
    { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '---', color: 'text-[#00ff88]', glow: 'shadow-[0_0_20px_rgba(0,255,136,0.15)]', borderColor: 'border-[#00ff88]/20', iconBg: 'bg-[#00ff88]/10' },
    { label: 'Avg Latency', value: stats ? `${Math.round(stats.avg_latency_ms)}ms` : '---', color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]', borderColor: 'border-amber-400/20', iconBg: 'bg-amber-400/10' },
    { label: 'Total Runs', value: stats?.total_runs ?? '---', color: 'text-[#00f0ff]', glow: 'shadow-[0_0_20px_rgba(0,240,255,0.15)]', borderColor: 'border-[#00f0ff]/20', iconBg: 'bg-[#00f0ff]/10' },
    { label: 'Tokens Used', value: stats?.total_tokens ? `${(stats.total_tokens / 1000).toFixed(1)}K` : '---', color: 'text-[#8b5cf6]', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]', borderColor: 'border-[#8b5cf6]/20', iconBg: 'bg-[#8b5cf6]/10' },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: '#1c1d2b' }}>
      {/* Ambient background grid */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="animate-fade-in mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="neon-text text-3xl font-black uppercase tracking-widest" style={{
                color: '#00f0ff',
                textShadow: '0 0 10px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2)'
              }}>
                War Room
              </h1>
              <div className="flex items-center gap-2 rounded-full px-3 py-1" style={{
                background: 'rgba(255,0,0,0.1)',
                border: '1px solid rgba(255,0,0,0.3)'
              }}>
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{
                  boxShadow: '0 0 8px rgba(255,0,0,0.8), 0 0 20px rgba(255,0,0,0.4)'
                }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Tactical operations center &mdash; real-time agent execution traces & performance metrics
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5" style={{
            background: 'rgba(0,240,255,0.05)',
            border: '1px solid rgba(0,240,255,0.15)'
          }}>
            <div className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00f0ff]/60">SYSTEMS NOMINAL</span>
          </div>
        </div>

        {/* HUD Stats */}
        <div className="animate-fade-in mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(s => (
            <div key={s.label} className={`game-card hud-stat group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02] ${s.borderColor} ${s.glow}`} style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              backdropFilter: 'blur(10px)'
            }}>
              {/* Corner accents */}
              <div className="absolute top-0 left-0 h-4 w-[1px] opacity-40" style={{ background: s.color.includes('00ff88') ? '#00ff88' : s.color.includes('amber') ? '#fbbf24' : s.color.includes('00f0ff') ? '#00f0ff' : '#8b5cf6' }} />
              <div className="absolute top-0 left-0 h-[1px] w-4 opacity-40" style={{ background: s.color.includes('00ff88') ? '#00ff88' : s.color.includes('amber') ? '#fbbf24' : s.color.includes('00f0ff') ? '#00f0ff' : '#8b5cf6' }} />
              <div className="absolute bottom-0 right-0 h-4 w-[1px] opacity-40" style={{ background: s.color.includes('00ff88') ? '#00ff88' : s.color.includes('amber') ? '#fbbf24' : s.color.includes('00f0ff') ? '#00f0ff' : '#8b5cf6' }} />
              <div className="absolute bottom-0 right-0 h-[1px] w-4 opacity-40" style={{ background: s.color.includes('00ff88') ? '#00ff88' : s.color.includes('amber') ? '#fbbf24' : s.color.includes('00f0ff') ? '#00f0ff' : '#8b5cf6' }} />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              <p className={`mt-2 text-3xl font-black tabular-nums ${s.color}`} style={{
                textShadow: s.color.includes('00ff88') ? '0 0 20px rgba(0,255,136,0.4)' :
                             s.color.includes('amber') ? '0 0 20px rgba(251,191,36,0.4)' :
                             s.color.includes('00f0ff') ? '0 0 20px rgba(0,240,255,0.4)' :
                             '0 0 20px rgba(139,92,246,0.4)'
              }}>{s.value as any}</p>
              {/* Scanline effect */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
              }} />
            </div>
          ))}
        </div>

        {/* Execution Log / Mission Reports */}
        <div className="animate-fade-in game-card rounded-xl border overflow-hidden" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          borderColor: 'rgba(255,255,255,0.06)'
        }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#00f0ff' }}>Mission Reports</h2>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{
                  background: 'rgba(0,240,255,0.1)',
                  color: '#00f0ff',
                  border: '1px solid rgba(0,240,255,0.2)'
                }}>{(runs as any[]).length} ops</span>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Click any row to expand the full LangChain execution trace</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="game-table w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(0,240,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Status', 'Agent', 'Input', 'Skills Called', 'Latency', 'Time'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(runs as any[]).map((run: any) => (
                  <Fragment key={run.id}>
                    <tr onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: expanded === run.id ? 'rgba(0,240,255,0.05)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (expanded !== run.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (expanded !== run.id) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          run.status === 'completed' ? 'badge-success' :
                          run.status === 'failed' ? 'badge-danger' :
                          'badge-info'
                        }`} style={{
                          background: run.status === 'completed' ? 'rgba(0,255,136,0.1)' :
                                      run.status === 'failed' ? 'rgba(255,0,170,0.1)' :
                                      'rgba(0,240,255,0.1)',
                          color: run.status === 'completed' ? '#00ff88' :
                                 run.status === 'failed' ? '#ff00aa' :
                                 '#00f0ff',
                          border: `1px solid ${run.status === 'completed' ? 'rgba(0,255,136,0.25)' :
                                               run.status === 'failed' ? 'rgba(255,0,170,0.25)' :
                                               'rgba(0,240,255,0.25)'}`,
                          boxShadow: run.status === 'completed' ? '0 0 10px rgba(0,255,136,0.15)' :
                                     run.status === 'failed' ? '0 0 10px rgba(255,0,170,0.15)' :
                                     '0 0 10px rgba(0,240,255,0.15)'
                        }}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            run.status === 'completed' ? 'bg-[#00ff88]' :
                            run.status === 'failed' ? 'bg-[#ff00aa]' :
                            'bg-[#00f0ff] animate-pulse'
                          }`} style={{
                            boxShadow: run.status === 'completed' ? '0 0 6px #00ff88' :
                                       run.status === 'failed' ? '0 0 6px #ff00aa' :
                                       '0 0 6px #00f0ff'
                          }} />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{run.agent_name}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{run.input_text}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(run.skills_called || []).slice(0, 3).map((s: string) => (
                            <code key={s} className="rounded px-1.5 py-0.5 text-[9.5px] font-bold" style={{
                              background: 'rgba(139,92,246,0.1)',
                              color: '#8b5cf6',
                              border: '1px solid rgba(139,92,246,0.2)'
                            }}>{s}</code>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{run.execution_time_ms}ms</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span className="font-mono">{new Date(run.created_at).toLocaleTimeString()}</span>
                        {expanded === run.id
                          ? <ChevronDown size={12} className="inline ml-2 text-[#00f0ff]" />
                          : <ChevronRight size={12} className="inline ml-2 text-[#00f0ff]/40" />}
                      </td>
                    </tr>
                    {expanded === run.id && (
                      <tr key={run.id + '-trace'}>
                        <td colSpan={6} className="p-0">
                          <div className="p-5" style={{
                            background: 'linear-gradient(135deg, rgba(0,240,255,0.03) 0%, rgba(139,92,246,0.03) 100%)',
                            borderTop: '2px solid #00f0ff',
                            boxShadow: 'inset 0 2px 20px rgba(0,240,255,0.05)'
                          }}>
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-black uppercase tracking-widest" style={{
                                color: '#00f0ff',
                                textShadow: '0 0 10px rgba(0,240,255,0.3)'
                              }}>Battle Report</span>
                              <span className="rounded px-2 py-0.5 text-[10px] font-bold font-mono" style={{
                                background: 'rgba(139,92,246,0.15)',
                                color: '#8b5cf6',
                                border: '1px solid rgba(139,92,246,0.25)'
                              }}>{run.model_name}</span>
                            </div>
                            {(run.execution_trace || []).length === 0 && (
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No trace steps recorded</p>
                            )}
                            <div className="space-y-2 pl-1">
                              {(run.execution_trace || []).map((step: any, i: number) => (
                                <div key={i} className="relative pl-5 py-2" style={{
                                  borderLeft: `2px solid ${step.status === 'ok' ? '#00ff88' : '#ff00aa'}`
                                }}>
                                  <div className="absolute -left-[5px] top-3 h-2 w-2 rounded-full" style={{
                                    background: step.status === 'ok' ? '#00ff88' : '#ff00aa',
                                    boxShadow: step.status === 'ok' ? '0 0 8px #00ff88' : '0 0 8px #ff00aa'
                                  }} />
                                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>{step.step}</p>
                                  <p className="mt-1 font-mono text-[11px] break-all" style={{ color: 'rgba(255,255,255,0.35)' }}>{JSON.stringify(step.input)}</p>
                                  {step.output && (
                                    <p className="mt-1.5 rounded-lg p-2 font-mono text-[10.5px]" style={{
                                      background: 'rgba(255,255,255,0.03)',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      color: 'rgba(255,255,255,0.45)'
                                    }}>{step.output}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {run.output_text && (
                              <div className="mt-5 rounded-xl p-4" style={{
                                background: 'rgba(0,255,136,0.03)',
                                border: '1px solid rgba(0,255,136,0.15)',
                                boxShadow: '0 0 15px rgba(0,255,136,0.05)'
                              }}>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#00ff88' }}>Final Output</p>
                                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.6)' }}>{run.output_text}</p>
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
              <div className="py-20 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <div className="mb-3 text-4xl" style={{
                  color: '#00f0ff',
                  textShadow: '0 0 20px rgba(0,240,255,0.3)',
                  opacity: 0.4
                }}>&#x2302;</div>
                <p className="text-sm font-bold uppercase tracking-widest">Awaiting Operations</p>
                <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>Run an agent to see mission traces here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline styles for custom classes and animations */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out both;
        }
        .animate-fade-in:nth-child(2) { animation-delay: 0.1s; }
        .animate-fade-in:nth-child(3) { animation-delay: 0.2s; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .game-card {
          position: relative;
          transition: all 0.3s ease;
        }

        .game-card:hover {
          border-color: rgba(0, 240, 255, 0.15) !important;
        }

        .hud-stat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,240,255,0.2), transparent);
        }

        .game-table tbody tr {
          transition: all 0.15s ease;
        }

        .neon-text {
          font-family: inherit;
        }

        .game-btn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          color: #00f0ff;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .game-btn:hover {
          background: rgba(0, 240, 255, 0.2);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
        }

        .game-btn-secondary {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: #8b5cf6;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .game-btn-secondary:hover {
          background: rgba(139, 92, 246, 0.2);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }

        .badge-success {
          text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
        }
        .badge-danger {
          text-shadow: 0 0 8px rgba(255, 0, 170, 0.5);
        }
        .badge-info {
          text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
        }
      `}</style>
    </div>
  )
}
