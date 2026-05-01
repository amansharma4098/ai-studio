'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { playgroundApi } from '@/lib/api'
import { Send, Loader2 } from 'lucide-react'
import { ModelSelector } from '@/components/ui/ModelSelector'

const QUICK_TESTS = [
  { label: 'Entra: List Groups', prompt: 'List all security groups starting with "sg-" in the Entra ID tenant' },
  { label: 'Azure: Cost Summary', prompt: 'Get the total Azure spend for this month, broken down by service' },
  { label: 'Cosmos DB Metrics', prompt: 'Check the RU/s usage and throttling stats for the prod-cosmos account' },
  { label: 'VM Inventory', prompt: 'List all virtual machines in rg-production with their power states and sizes' },
  { label: 'Budget Status', prompt: 'Check current Azure budget consumption and alert if over 80% threshold' },
]

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState('List all security groups in Entra ID starting with "sg-" and show member counts.')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful Microsoft 365 and Azure administrator assistant.')
  const [model, setModel] = useState('anthropic/claude-sonnet')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [response, setResponse] = useState('')
  const [latency, setLatency] = useState<number | null>(null)

  const runMut = useMutation({
    mutationFn: () => {
      const start = Date.now()
      return playgroundApi.run({ prompt, system_prompt: systemPrompt, model_name: model, temperature, max_tokens: maxTokens })
        .then(r => { setLatency(Date.now() - start); return r })
    },
    onSuccess: (r) => setResponse(r.data.response),
  })

  const providerName = model.split('/')[0] || 'anthropic'

  const getLatencyColor = (ms: number) => {
    if (ms < 2000) return { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)', color: '#00ff88', shadow: '0 0 12px rgba(0,255,136,0.3)' }
    if (ms < 5000) return { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', shadow: '0 0 12px rgba(251,191,36,0.3)' }
    return { bg: 'rgba(255,77,106,0.1)', border: 'rgba(255,77,106,0.3)', color: '#ff4d6a', shadow: '0 0 12px rgba(255,77,106,0.3)' }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#00f0ff',
            boxShadow: '0 0 10px rgba(0,240,255,0.5), 0 0 20px rgba(0,240,255,0.2)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }} />
          <h1 className="text-2xl font-bold neon-text" style={{ letterSpacing: '1px' }}>
            TESTING GROUNDS
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Deploy prompts against any model -- Claude, GPT, Gemini, Llama, and more
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: '580px' }}>

        {/* ── Left Panel: LOADOUT ────────────────────────────── */}
        <div className="game-card flex flex-col gap-4 p-5">
          {/* Panel header */}
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 8, height: 8, borderRadius: 2, background: '#8b5cf6',
              boxShadow: '0 0 8px rgba(139,92,246,0.5)',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase' as const, color: '#8b5cf6',
            }}>
              Loadout
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Configure your parameters
            </span>
          </div>

          {/* Model + Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase' as const,
                color: 'var(--accent)', marginBottom: 6,
              }}>
                Model
              </label>
              <ModelSelector value={model} onChange={setModel} />
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase' as const,
                color: 'var(--accent)', marginBottom: 6,
              }}>
                Temperature ({temperature})
              </label>
              <input
                type="range" min="0" max="2" step="0.1"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                style={{
                  width: '100%', marginTop: 10,
                  accentColor: '#00f0ff',
                }}
              />
              <div className="flex justify-between" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              color: 'var(--accent)', marginBottom: 6,
            }}>
              System Directive
            </label>
            <textarea
              rows={2}
              className="game-input"
              style={{ fontFamily: 'monospace', fontSize: 12, resize: 'none' }}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
            />
          </div>

          {/* Prompt */}
          <div className="flex-1 flex flex-col">
            <label style={{
              display: 'block', fontSize: 10, fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              color: 'var(--accent)', marginBottom: 6,
            }}>
              Prompt Payload
            </label>
            <textarea
              className="game-input"
              style={{ flex: 1, minHeight: 160, fontSize: 13, resize: 'none' }}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          {/* Quick tests -- Mission Select */}
          <div style={{
            borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.15)',
            background: 'rgba(139,92,246,0.04)',
            padding: 12,
          }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6',
                boxShadow: '0 0 6px rgba(139,92,246,0.5)',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase' as const, color: '#8b5cf6',
              }}>
                Mission Select
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TESTS.map(q => (
                <button
                  key={q.label}
                  onClick={() => setPrompt(q.prompt)}
                  className="game-btn-secondary"
                  style={{
                    padding: '6px 12px', fontSize: 11,
                    borderColor: 'rgba(139,92,246,0.2)',
                    background: 'rgba(139,92,246,0.06)',
                    color: '#a78bfa',
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={() => runMut.mutate()}
            disabled={runMut.isPending || !prompt.trim()}
            className="game-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '12px 24px', fontSize: 13,
            }}
          >
            {runMut.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                ENGAGING...
              </>
            ) : (
              <>
                <Send size={13} />
                EXECUTE PROMPT
              </>
            )}
          </button>
        </div>

        {/* ── Right Panel: COMBAT LOG ───────────────────────── */}
        <div className="game-card flex flex-col gap-4 p-5">
          {/* Panel header */}
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 8, height: 8, borderRadius: 2, background: '#00ff88',
                boxShadow: '0 0 8px rgba(0,255,136,0.5)',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '2px',
                textTransform: 'uppercase' as const, color: '#00ff88',
              }}>
                Combat Log
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="badge-info">{model}</span>
              {latency !== null && (() => {
                const lc = getLatencyColor(latency)
                return (
                  <span style={{
                    background: lc.bg, color: lc.color,
                    border: `1px solid ${lc.border}`,
                    padding: '2px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 600,
                    boxShadow: lc.shadow,
                    transition: 'all 0.3s ease',
                  }}>
                    {latency}ms
                  </span>
                )
              })()}
            </div>
          </div>

          {/* Response Terminal */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              minHeight: 300, borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#0a0a12',
              padding: 0,
              position: 'relative',
            }}
          >
            {/* Terminal top bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(0,240,255,0.02)',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d6a' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88' }} />
              <span style={{
                fontSize: 10, color: 'var(--text-muted)', marginLeft: 8,
                fontFamily: 'monospace', letterSpacing: '0.5px',
              }}>
                output://response-stream
              </span>
            </div>

            {/* Terminal body */}
            <div style={{
              padding: 16,
              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
              fontSize: 12.5, lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: '#00ff88',
            }}>
              {runMut.isPending ? (
                <span style={{ color: '#fbbf24' }}>
                  <span style={{ color: '#00f0ff' }}>[STREAM]</span> Querying {providerName} ({model.split('/')[1] || model})...
                  <span className="animate-pulse" style={{ display: 'inline-block', marginLeft: 4 }}>_</span>
                </span>
              ) : response ? (
                <span className="animate-fade-in" style={{ color: 'var(--text-primary)' }}>{response}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'rgba(0,240,255,0.4)' }}>{'>'}</span> Awaiting prompt execution...
                  {'\n'}
                  <span style={{ color: 'rgba(0,240,255,0.4)' }}>{'>'}</span> Click <span style={{ color: '#00f0ff' }}>EXECUTE PROMPT</span> to begin combat sequence.
                </span>
              )}
            </div>
          </div>

          {/* Execution Log -- Debug Console */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#00f0ff',
                boxShadow: '0 0 6px rgba(0,240,255,0.5)',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase' as const, color: '#00f0ff',
              }}>
                Debug Console
              </span>
            </div>
            <div style={{
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#0a0a12',
              padding: '8px 12px',
              fontFamily: '"Fira Code", "Cascadia Code", monospace',
            }}>
              {[
                { label: 'Provider', value: providerName, status: 'ok' },
                { label: 'Model', value: model, status: 'ok' },
                { label: 'Temperature', value: String(temperature), status: 'ok' },
              ].map((l, i) => (
                <div
                  key={l.label}
                  className="flex items-center gap-2"
                  style={{
                    padding: '5px 0',
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    fontSize: 11,
                  }}
                >
                  <span style={{
                    color: '#00ff88', fontWeight: 600,
                    fontFamily: 'monospace', fontSize: 10,
                  }}>
                    [OK]
                  </span>
                  <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{l.label}</span>
                  <span style={{ color: '#00f0ff', fontFamily: 'monospace' }}>{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
