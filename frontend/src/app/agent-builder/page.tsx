'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Wand2, Bot, Loader2, Sparkles, ArrowRight, Zap,
  Server, BarChart3, Shield, Headphones, Search, DollarSign,
  ChevronRight, Copy, Check
} from 'lucide-react'
import { api } from '@/lib/api'

const TEMPLATE_ICONS: Record<string, any> = {
  'server': Server, 'bar-chart': BarChart3, 'shield': Shield,
  'headphones': Headphones, 'search': Search, 'dollar-sign': DollarSign,
  'bot': Bot,
}

export default function AgentBuilderPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [generatedConfig, setGeneratedConfig] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: () => api.get('/agent-builder/templates').then(r => r.data),
  })

  // Generate agent from description
  const generateMutation = useMutation({
    mutationFn: (desc: string) =>
      api.post('/agent-builder/generate', { description: desc }).then(r => r.data),
    onSuccess: (data) => setGeneratedConfig(data),
  })

  // Create agent (auto-create)
  const createMutation = useMutation({
    mutationFn: (desc: string) =>
      api.post('/agent-builder/create', { description: desc }).then(r => r.data),
    onSuccess: (data) => {
      if (data.agent_id) router.push('/agents')
    },
  })

  // Create from template
  const templateMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.post('/agent-builder/from-template', null, { params: { template_id: templateId } }).then(r => r.data),
    onSuccess: () => router.push('/agents'),
  })

  const handleGenerate = () => {
    if (!description.trim()) return
    generateMutation.mutate(description.trim())
  }

  const handleCreateNow = () => {
    if (!description.trim()) return
    createMutation.mutate(description.trim())
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Wand2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Smart Agent Builder</h1>
            <p className="text-sm text-slate-500">Describe what you need. Claude builds the agent.</p>
          </div>
        </div>
      </div>

      {/* Description Input */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Describe your agent in plain English
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., I need an agent that monitors my Azure costs daily, identifies any spending anomalies, and sends a Slack alert if costs exceed the budget by more than 10%..."
          className="w-full rounded-xl border border-violet-200 bg-white p-4 text-sm text-slate-700 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
          rows={4}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || generateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={16} /> Preview Agent Config</>
            )}
          </button>
          <button
            onClick={handleCreateNow}
            disabled={!description.trim() || createMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Creating...</>
            ) : (
              <><Zap size={16} /> Create Instantly</>
            )}
          </button>
        </div>

        {/* Quick suggestions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Monitor Azure costs and alert on anomalies",
            "Review Entra ID security configurations",
            "Research any topic and create a report",
            "Handle customer support tickets via email",
            "Analyze SQL data and generate insights",
          ].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setDescription(suggestion)}
              className="rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] text-violet-600 hover:bg-violet-50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Config Preview */}
      {generatedConfig && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-800">Generated Agent</h2>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy Config'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</span>
                <p className="text-sm font-semibold text-slate-800">{generatedConfig.icon} {generatedConfig.name}</p>
              </div>
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
                <p className="text-sm text-slate-600">{generatedConfig.description}</p>
              </div>
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Model</span>
                <p className="text-sm text-slate-600">{generatedConfig.model_name} | temp: {generatedConfig.temperature}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skills</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {generatedConfig.suggested_skills?.map((s: string) => (
                    <span key={s} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Prompt</span>
              <pre className="mt-1 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {generatedConfig.system_prompt}
              </pre>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreateNow}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Create This Agent
            </button>
          </div>
        </div>
      )}

      {/* Templates */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Pre-built Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates as any[]).map((tpl: any) => {
            const Icon = TEMPLATE_ICONS[tpl.icon] || Bot
            return (
              <div
                key={tpl.id}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-violet-300 hover:shadow-md cursor-pointer"
                onClick={() => templateMutation.mutate(tpl.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{tpl.name}</h3>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">{tpl.category}</span>
                  </div>
                </div>
                <p className="text-[12px] text-slate-500 mb-3 line-clamp-2">{tpl.description}</p>
                <div className="flex flex-wrap gap-1">
                  {tpl.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{tag}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-violet-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Use template <ChevronRight size={12} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
