'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, deploymentsApi } from '@/lib/api'
import {
  Rocket, Globe, Code, Terminal, Copy, Check, ExternalLink,
  Loader2, Trash2, RefreshCw, Settings, ToggleLeft, ToggleRight,
  Bot, ChevronDown, ChevronRight, Eye, MessageSquare, Shield
} from 'lucide-react'

export default function DeploymentsPage() {
  const qc = useQueryClient()
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [deployModal, setDeployModal] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    welcome_message: 'Hi! How can I help you today?',
    theme_color: '#10b981',
    rate_limit_rpm: 30,
    allowed_domains: '',
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then(r => r.data),
  })

  // Load deployments for all agents
  const { data: allDeployments = {} } = useQuery({
    queryKey: ['all-deployments'],
    queryFn: async () => {
      const map: Record<string, any[]> = {}
      for (const agent of agents as any[]) {
        try {
          const r = await deploymentsApi.list(agent.id)
          if (r.data.length > 0) map[agent.id] = r.data
        } catch {}
      }
      return map
    },
    enabled: (agents as any[]).length > 0,
  })

  const deployMut = useMutation({
    mutationFn: (agentId: string) => deploymentsApi.deploy(agentId, {
      settings: {
        welcome_message: settings.welcome_message,
        theme_color: settings.theme_color,
        show_branding: true,
      },
      rate_limit_rpm: settings.rate_limit_rpm,
      allowed_domains: settings.allowed_domains ? settings.allowed_domains.split(',').map(d => d.trim()) : [],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-deployments'] }); setDeployModal(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deploymentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-deployments'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      deploymentsApi.update(id, { is_active: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-deployments'] }),
  })

  const regenMut = useMutation({
    mutationFn: (id: string) => deploymentsApi.regenerateToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-deployments'] }),
  })

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const deployedAgentIds = new Set(Object.keys(allDeployments))
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.stupidaistudio.com'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Deployments</h1>
        <p className="mt-1 text-sm text-slate-500">Deploy your agents as chat widgets, shareable links, and API endpoints</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Rocket size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{deployedAgentIds.size}</p>
              <p className="text-xs text-slate-500">Deployed Agents</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <MessageSquare size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {Object.values(allDeployments).flat().reduce((a: number, d: any) => a + (d.total_messages || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Messages</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Eye size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {Object.values(allDeployments).flat().reduce((a: number, d: any) => a + (d.total_conversations || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {(agents as any[]).map((agent: any) => {
          const deps = allDeployments[agent.id] || []
          const isDeployed = deps.length > 0
          const dep = deps[0]
          const isExpanded = expandedAgent === agent.id

          return (
            <div key={agent.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Agent header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Bot size={18} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 truncate">{agent.name}</h3>
                    {isDeployed ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dep.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {dep.is_active ? 'LIVE' : 'PAUSED'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">NOT DEPLOYED</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{agent.description || agent.model_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDeployed ? (
                    <>
                      <button
                        onClick={() => toggleMut.mutate({ id: dep.id, active: !dep.is_active })}
                        className="p-2 rounded-lg hover:bg-slate-50 transition-colors"
                        title={dep.is_active ? 'Pause' : 'Activate'}
                      >
                        {dep.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-400" />}
                      </button>
                      <button
                        onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                        className="p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeployModal(agent.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                    >
                      <Rocket size={12} /> Deploy
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded deployment details */}
              {isExpanded && dep && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Share Link */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-slate-700">Share Link</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 truncate">
                          /share/{dep.slug}
                        </code>
                        <button onClick={() => copyToClipboard(`${window.location.origin}/share/${dep.slug}`, 'link')}
                          className="p-1.5 rounded hover:bg-slate-100">
                          {copied === 'link' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                        <a href={`/share/${dep.slug}`} target="_blank" className="p-1.5 rounded hover:bg-slate-100">
                          <ExternalLink size={12} className="text-slate-400" />
                        </a>
                      </div>
                    </div>

                    {/* Embed Widget */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Code size={14} className="text-violet-500" />
                        <span className="text-xs font-bold text-slate-700">Embed Widget</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 truncate">
                          {`<script src="${window.location.origin}/embed.js" data-agent="${dep.slug}"></script>`}
                        </code>
                        <button onClick={() => copyToClipboard(dep.embed_code, 'embed')}
                          className="p-1.5 rounded hover:bg-slate-100">
                          {copied === 'embed' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {/* API Endpoint */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Terminal size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-700">API Endpoint</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 truncate">
                          POST {API_URL}{dep.api_endpoint}
                        </code>
                        <button onClick={() => copyToClipboard(`curl -X POST ${API_URL}${dep.api_endpoint} -H "Content-Type: application/json" -d '{"message": "Hello"}'`, 'api')}
                          className="p-1.5 rounded hover:bg-slate-100">
                          {copied === 'api' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>{dep.total_conversations || 0} conversations</span>
                      <span>{dep.total_messages || 0} messages</span>
                      <span>Rate: {dep.rate_limit_rpm} req/min</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => regenMut.mutate(dep.id)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                        <RefreshCw size={11} /> Regenerate Token
                      </button>
                      <button onClick={() => { if (confirm('Delete this deployment?')) deleteMut.mutate(dep.id) }}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {(agents as any[]).length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Bot size={40} className="mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-700">No agents yet</h3>
            <p className="mt-1 text-sm text-slate-500">Create an agent first, then deploy it here.</p>
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      {deployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeployModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Deploy Agent</h2>
            <p className="text-sm text-slate-500 mb-5">Make this agent accessible via link, widget, or API</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Welcome Message</label>
                <input type="text" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={settings.welcome_message}
                  onChange={e => setSettings(s => ({ ...s, welcome_message: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Theme Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-8 w-8 rounded border-0 cursor-pointer"
                    value={settings.theme_color}
                    onChange={e => setSettings(s => ({ ...s, theme_color: e.target.value }))} />
                  <input type="text" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    value={settings.theme_color}
                    onChange={e => setSettings(s => ({ ...s, theme_color: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Rate Limit (requests/minute)</label>
                <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={settings.rate_limit_rpm}
                  onChange={e => setSettings(s => ({ ...s, rate_limit_rpm: parseInt(e.target.value) || 30 }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Allowed Domains (comma-separated, empty = all)</label>
                <input type="text" placeholder="example.com, app.example.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  value={settings.allowed_domains}
                  onChange={e => setSettings(s => ({ ...s, allowed_domains: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeployModal(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => deployMut.mutate(deployModal)}
                disabled={deployMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {deployMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                Deploy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
