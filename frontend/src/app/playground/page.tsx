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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Playground</h1>
        <p className="mt-1 text-sm text-slate-500">Test prompts against any model — Claude, GPT, Gemini, Llama, and more</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: '580px' }}>
        {/* Input panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Model</label>
              <ModelSelector value={model} onChange={setModel} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Temperature ({temperature})</label>
              <input type="range" min="0" max="2" step="0.1" className="w-full mt-2.5 accent-emerald-500" value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">System Prompt</label>
            <textarea rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Prompt</label>
            <textarea className="flex-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ minHeight: '160px' }} value={prompt} onChange={e => setPrompt(e.target.value)} />
          </div>

          {/* Quick tests */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Test Prompts</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TESTS.map(q => (
                <button key={q.label} onClick={() => setPrompt(q.prompt)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => runMut.mutate()} disabled={runMut.isPending || !prompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {runMut.isPending ? <><Loader2 size={14} className="animate-spin" />Running...</> : <><Send size={13} />Run Prompt</>}
          </button>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Response</span>
            <div className="flex gap-1.5 flex-wrap">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{model}</span>
              {latency && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{latency}ms</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-slate-700"
            style={{ minHeight: '300px' }}>
            {runMut.isPending
              ? <span className="text-slate-400">Querying {providerName} ({model.split('/')[1] || model})...</span>
              : response || <span className="text-slate-400">Response will appear here. Click &quot;Run Prompt&quot; to execute.</span>}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Execution Log</p>
            <div className="space-y-1.5">
              {[
                { label: 'Provider', value: providerName, status: 'ok' },
                { label: 'Model', value: model, status: 'ok' },
                { label: 'Temperature', value: String(temperature), status: 'ok' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 rounded border-l-2 border-emerald-500 pl-2.5 py-0.5 bg-slate-50 text-[11px]">
                  <span className="text-slate-400 min-w-[100px]">{l.label}</span>
                  <code className="text-slate-700">{l.value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
