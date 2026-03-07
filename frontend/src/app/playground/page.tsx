'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { playgroundApi } from '@/lib/api'
import { Send, Loader2 } from 'lucide-react'

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
  const [model, setModel] = useState('llama3')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Playground</h1>
        <p className="mt-1 text-xs text-muted-foreground">Test prompts directly against Ollama LLMs — no agent overhead</p>
      </div>

      <div className="grid grid-cols-2 gap-5" style={{ minHeight: '580px' }}>
        {/* Input panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Model</label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={model} onChange={e => setModel(e.target.value)}>
                <option value="llama3">🦙 Llama 3</option>
                <option value="mistral">🌀 Mistral 7B</option>
                <option value="gemma">💎 Gemma</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Temperature ({temperature})</label>
              <input type="range" min="0" max="2" step="0.1" className="w-full mt-2.5" value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">System Prompt</label>
            <textarea rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs resize-none focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Prompt</label>
            <textarea className="flex-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              style={{ minHeight: '160px' }} value={prompt} onChange={e => setPrompt(e.target.value)} />
          </div>

          {/* Quick tests */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Test Prompts</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TESTS.map(q => (
                <button key={q.label} onClick={() => setPrompt(q.prompt)}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent transition-colors">
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => runMut.mutate()} disabled={runMut.isPending || !prompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50">
            {runMut.isPending ? <><Loader2 size={14} className="animate-spin" />Running...</> : <><Send size={13} />Run Prompt</>}
          </button>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Response</span>
            <div className="flex gap-1.5 flex-wrap">
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">{model}</span>
              {latency && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">{latency}ms</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground"
            style={{ minHeight: '300px' }}>
            {runMut.isPending
              ? <span className="text-muted-foreground">Querying Ollama ({model})...</span>
              : response || <span className="text-muted-foreground">Response will appear here. Click "Run Prompt" to execute.</span>}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution Log</p>
            <div className="space-y-1.5">
              {[
                { label: 'Ollama endpoint', value: `POST http://localhost:11434/api/generate`, status: 'ok' },
                { label: 'Model', value: model, status: 'ok' },
                { label: 'Temperature', value: String(temperature), status: 'ok' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 rounded border-l-2 border-emerald-500 pl-2.5 py-0.5 bg-muted/30 text-[11px]">
                  <span className="text-muted-foreground min-w-[100px]">{l.label}</span>
                  <code className="text-foreground">{l.value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
