'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { playgroundApi } from '@/lib/api'
import { ChevronDown, Check, Zap, Brain, Sparkles, Search, Server, Globe } from 'lucide-react'

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  className?: string
  compact?: boolean
}

const PROVIDER_ICONS: Record<string, any> = {
  anthropic: Brain,
  openai: Sparkles,
  google: Globe,
  groq: Zap,
  ollama: Server,
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'text-amber-600 bg-amber-50 border-amber-200',
  openai: 'text-green-600 bg-green-50 border-green-200',
  google: 'text-blue-600 bg-blue-50 border-blue-200',
  groq: 'text-purple-600 bg-purple-50 border-purple-200',
  ollama: 'text-slate-600 bg-slate-50 border-slate-200',
}

export function ModelSelector({ value, onChange, className = '', compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['available-models'],
    queryFn: () => playgroundApi.models().then(r => r.data),
    staleTime: 60000,
  })

  const providers = data?.providers || []

  // Find current model display name
  const findModel = () => {
    for (const p of providers) {
      for (const m of p.models || []) {
        if (m.id === value) return { model: m, provider: p }
      }
    }
    // Fallback for legacy names
    const legacy: Record<string, string> = {
      'claude-opus': 'Claude Opus', 'claude-sonnet': 'Claude Sonnet', 'claude-haiku': 'Claude Haiku',
    }
    return { model: { id: value, name: legacy[value] || value }, provider: { id: 'anthropic', name: 'Anthropic' } }
  }

  const current = findModel()
  const ProviderIcon = PROVIDER_ICONS[current.provider.id] || Brain

  const filtered = providers.map((p: any) => ({
    ...p,
    models: (p.models || []).filter((m: any) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((p: any) => p.models.length > 0)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-slate-300 focus:border-emerald-500 focus:outline-none ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
      >
        <ProviderIcon size={compact ? 12 : 14} className="shrink-0 text-slate-500" />
        <span className="flex-1 truncate text-slate-800 font-medium">
          {current.model.name}
        </span>
        <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 border ${PROVIDER_COLORS[current.provider.id] || 'text-slate-600 bg-slate-50'}`}>
          {current.provider.name}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {/* Search */}
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                <Search size={12} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search models..."
                  className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-[340px] overflow-y-auto py-1">
              {filtered.map((provider: any) => {
                const Icon = PROVIDER_ICONS[provider.id] || Brain
                return (
                  <div key={provider.id}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Icon size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{provider.name}</span>
                      {!provider.configured && (
                        <span className="text-[9px] font-medium text-amber-500 bg-amber-50 rounded-full px-1.5 py-0.5">No API Key</span>
                      )}
                    </div>
                    {provider.models.map((model: any) => {
                      const isSelected = model.id === value
                      const disabled = !provider.configured
                      return (
                        <button
                          key={model.id}
                          disabled={disabled}
                          onClick={() => { onChange(model.id); setOpen(false); setSearch('') }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors ${
                            disabled ? 'opacity-40 cursor-not-allowed' :
                            isSelected ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{model.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {model.context_window && (
                                <span className="text-[10px] text-slate-400">{(model.context_window / 1000).toFixed(0)}K ctx</span>
                              )}
                              {model.supports_tools && (
                                <span className="text-[10px] text-emerald-500">Tools</span>
                              )}
                              {model.supports_streaming && (
                                <span className="text-[10px] text-blue-500">Stream</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-500" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-400">No models found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
