'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bot, Send, Trash2, Loader2, CheckCircle, Sparkles, Zap, AlertTriangle, Check, MessageSquare, X, Pencil } from 'lucide-react'
import { agentsApi, skillsApi, credentialsApi, threadsApi } from '@/lib/api'
import Link from 'next/link'

interface SkillBinding { skillId: string; skillName: string; credentialId: string | null }

// ── Skill → Prompt Snippet Mapping ──────────────────────────────
const SKILL_PROMPT_SNIPPETS: Record<string, string> = {
  web_scraping: 'You can scrape and extract data from websites.',
  sql_query: 'You can query databases and analyze data.',
  email: 'You can draft and send emails.',
  slack: 'You can send messages and notifications via Slack.',
  rest_api: 'You can call external REST APIs to fetch or send data.',
  data_analysis: 'You can analyze datasets and generate insights.',
  entra: 'You can manage Microsoft Entra ID users, groups, and policies.',
  azure: 'You can manage Azure cloud resources and infrastructure.',
  devops: 'You can interact with CI/CD pipelines and DevOps tools.',
}

function generatePromptFromSkills(bindings: SkillBinding[]): string {
  const seen = new Set<string>()
  const snippets: string[] = []
  for (const b of bindings) {
    const lower = b.skillName.toLowerCase()
    for (const [key, snippet] of Object.entries(SKILL_PROMPT_SNIPPETS)) {
      if (lower.includes(key) && !seen.has(key)) {
        seen.add(key)
        snippets.push(snippet)
      }
    }
  }
  if (snippets.length === 0) return 'You are a helpful assistant.'
  return 'You are a helpful assistant.\n' + snippets.join('\n')
}

// ── Agent Templates (Quick Start) ───────────────────────────────
const AGENT_TEMPLATES = [
  {
    name: 'Report Analyst',
    icon: '📊',
    description: 'Analyzes data and generates structured reports',
    system_prompt: 'You analyze data and generate structured reports with insights.',
    model_name: 'claude-sonnet',
    temperature: 0.3,
    skillPatterns: ['sql_query', 'data_analysis'],
  },
  {
    name: 'Web Researcher',
    icon: '🔍',
    description: 'Researches topics online and summarizes findings',
    system_prompt: 'You research topics online and summarize findings clearly.',
    model_name: 'mixtral',
    temperature: 0.5,
    skillPatterns: ['web_scraping', 'rest_api'],
  },
  {
    name: 'Email Assistant',
    icon: '✉️',
    description: 'Drafts professional emails and communications',
    system_prompt: 'You draft professional emails and communications.',
    model_name: 'claude-sonnet',
    temperature: 0.7,
    skillPatterns: ['email'],
  },
  {
    name: 'General Assistant',
    icon: '🤖',
    description: 'A helpful assistant for general questions',
    system_prompt: 'You are a helpful assistant that answers questions.',
    model_name: 'claude-sonnet',
    temperature: 0.7,
    skillPatterns: [],
  },
]

// ── Config JSON placeholders per skill type ─────────────────────
const SKILL_TYPE_PLACEHOLDERS: Record<string, string> = {
  'REST API': '{"url": "https://api.example.com", "method": "GET", "headers": {}}',
  'SQL Query': '{"connection": "postgresql://...", "query": "SELECT * FROM table"}',
  'Python Function': '{"code": "def run(input):\\n    return input.upper()"}',
  'Web Scraper': '{"url": "https://example.com", "selector": ".content"}',
}

const SKILL_TYPE_BADGE_COLORS: Record<string, string> = {
  'REST API': 'bg-blue-100 text-blue-700',
  'SQL Query': 'bg-amber-100 text-amber-700',
  'Python Function': 'bg-green-100 text-green-700',
  'Web Scraper': 'bg-purple-100 text-purple-700',
}

export default function AgentsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'create' | { type: 'chat'; agentId: string }>(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', description: '', system_prompt: 'You are a helpful Microsoft 365 and Azure assistant.', model_name: 'claude-sonnet', temperature: 0.7, memory_enabled: true, skill_bindings: [] as SkillBinding[] })
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<{ role: string; content: string }[]>([])
  const [running, setRunning] = useState(false)
  const [threads, setThreads] = useState<any[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [threadsLoading, setThreadsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Edit Agent state ──
  const [editAgent, setEditAgent] = useState<any>(null)
  const [editTab, setEditTab] = useState<'general' | 'skills' | 'advanced'>('general')
  const [editForm, setEditForm] = useState({ name: '', system_prompt: '', model_name: '', temperature: 0.7 })
  const [agentSkills, setAgentSkills] = useState<any[]>([])
  const [newSkill, setNewSkill] = useState({ skill_name: '', skill_type: 'REST API', config_json: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [skillAdding, setSkillAdding] = useState(false)
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState(false)
  const [skillDeleteConfirm, setSkillDeleteConfirm] = useState<string | null>(null)

  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })
  const { data: credentials = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })

  const allSkills = (catalog as any[]).flatMap((c: any) => c.tags.flatMap((t: any) => t.skills.map((s: any) => ({ ...s, catId: c.id, catName: c.name, credType: c.credType }))))

  const applyTemplate = (tpl: typeof AGENT_TEMPLATES[number]) => {
    const matchedBindings: SkillBinding[] = []
    for (const pattern of tpl.skillPatterns) {
      const match = allSkills.find((s: any) => s.name?.toLowerCase().includes(pattern) || s.id?.toLowerCase().includes(pattern))
      if (match) matchedBindings.push({ skillId: match.id, skillName: match.name, credentialId: null })
    }
    setForm({
      name: tpl.name,
      description: tpl.description,
      system_prompt: tpl.system_prompt,
      model_name: tpl.model_name,
      temperature: tpl.temperature,
      memory_enabled: true,
      skill_bindings: matchedBindings,
    })
  }

  const createMut = useMutation({
    mutationFn: (data: any) => agentsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setModal(null); setStep(1); setForm({ name: '', description: '', system_prompt: 'You are a helpful Microsoft 365 and Azure assistant.', model_name: 'claude-sonnet', temperature: 0.7, memory_enabled: true, skill_bindings: [] }) },
  })

  const deleteMut = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })

  // ── Edit Agent handlers ──
  const openEditModal = async (agentId: string) => {
    try {
      const { data } = await agentsApi.get(agentId)
      setEditAgent(data)
      setEditForm({
        name: data.name || '',
        system_prompt: data.system_prompt || '',
        model_name: data.model_name || 'claude-sonnet',
        temperature: data.temperature ?? 0.7,
      })
      setEditTab('general')
      setEditSuccess(false)
      setDeleteConfirmAgent(false)
      setSkillDeleteConfirm(null)
      // Fetch skills
      try {
        const skillsRes = await agentsApi.getSkills(agentId)
        setAgentSkills(skillsRes.data || [])
      } catch {
        setAgentSkills([])
      }
    } catch {}
  }

  const closeEditModal = () => {
    setEditAgent(null)
    setEditSuccess(false)
    setNewSkill({ skill_name: '', skill_type: 'REST API', config_json: '' })
  }

  const saveEditForm = async () => {
    if (!editAgent) return
    setEditSaving(true)
    setEditSuccess(false)
    try {
      await agentsApi.update(editAgent.id, editForm)
      setEditSuccess(true)
      qc.invalidateQueries({ queryKey: ['agents'] })
      setTimeout(() => setEditSuccess(false), 3000)
    } catch {}
    finally { setEditSaving(false) }
  }

  const addAgentSkill = async () => {
    if (!editAgent || !newSkill.skill_name.trim()) return
    setSkillAdding(true)
    try {
      await agentsApi.addSkill(editAgent.id, {
        skill_name: newSkill.skill_name,
        skill_type: newSkill.skill_type,
        config_json: newSkill.config_json,
      })
      const res = await agentsApi.getSkills(editAgent.id)
      setAgentSkills(res.data || [])
      setNewSkill({ skill_name: '', skill_type: 'REST API', config_json: '' })
    } catch {}
    finally { setSkillAdding(false) }
  }

  const removeAgentSkill = async (skillId: string) => {
    if (!editAgent) return
    try {
      await agentsApi.removeSkill(editAgent.id, skillId)
      setAgentSkills(prev => prev.filter(s => s.id !== skillId))
      setSkillDeleteConfirm(null)
    } catch {}
  }

  const deleteAgentFull = async () => {
    if (!editAgent) return
    try {
      await agentsApi.delete(editAgent.id)
      qc.invalidateQueries({ queryKey: ['agents'] })
      closeEditModal()
    } catch {}
  }

  const toggleSkill = (sk: any) => {
    const exists = form.skill_bindings.find(b => b.skillId === sk.id)
    if (exists) setForm({ ...form, skill_bindings: form.skill_bindings.filter(b => b.skillId !== sk.id) })
    else setForm({ ...form, skill_bindings: [...form.skill_bindings, { skillId: sk.id, skillName: sk.name, credentialId: null }] })
  }

  const bindCred = (skillId: string, credId: string) => {
    setForm({ ...form, skill_bindings: form.skill_bindings.map(b => b.skillId === skillId ? { ...b, credentialId: credId || null } : b) })
  }

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, running])

  // ── Fetch threads when chat modal opens ──
  useEffect(() => {
    if (!modal || typeof modal !== 'object' || modal.type !== 'chat') return
    const agentId = modal.agentId
    setThreadsLoading(true)
    threadsApi.listByAgent(agentId).then(async (res) => {
      const list = (res.data || []).sort((a: any, b: any) =>
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      )
      if (list.length > 0) {
        setThreads(list)
        loadThread(list[0].id)
      } else {
        // Auto-create first thread
        try {
          const created = await threadsApi.create(agentId)
          const newThread = created.data
          setThreads([newThread])
          loadThread(newThread.id)
        } catch {
          setThreads([])
          setActiveThreadId(null)
          setChatMsgs([])
        }
      }
    }).catch(() => {
      setThreads([])
      setActiveThreadId(null)
      setChatMsgs([])
    }).finally(() => setThreadsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal && typeof modal === 'object' && modal.type === 'chat' ? modal.agentId : null])

  const loadThread = async (threadId: string) => {
    setActiveThreadId(threadId)
    try {
      const res = await threadsApi.getMessages(threadId)
      const msgs = (res.data || []).map((m: any) => ({ role: m.role, content: m.content }))
      setChatMsgs(msgs.length > 0 ? msgs : [])
    } catch {
      setChatMsgs([])
    }
  }

  const createNewThread = async () => {
    if (!modal || typeof modal !== 'object' || modal.type !== 'chat') return
    try {
      const res = await threadsApi.create(modal.agentId)
      const newThread = res.data
      setThreads(prev => [newThread, ...prev])
      loadThread(newThread.id)
    } catch {}
  }

  const deleteThread = async (threadId: string) => {
    try {
      await threadsApi.delete(threadId)
      setThreads(prev => {
        const updated = prev.filter(t => t.id !== threadId)
        if (activeThreadId === threadId) {
          if (updated.length > 0) {
            loadThread(updated[0].id)
          } else {
            setActiveThreadId(null)
            setChatMsgs([])
          }
        }
        return updated
      })
    } catch {}
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const sendChat = async () => {
    if (!chatInput.trim() || running || !activeThreadId) return
    const userMsg = chatInput
    setChatInput('')
    setChatMsgs(m => [...m, { role: 'user', content: userMsg }])
    setRunning(true)
    try {
      const resp = await threadsApi.chat(activeThreadId, userMsg)
      setChatMsgs(m => [...m, { role: 'assistant', content: resp.data.output_text || resp.data.content || 'No response' }])
      // Update thread title/timestamp in sidebar
      setThreads(prev => prev.map(t =>
        t.id === activeThreadId
          ? { ...t, title: t.title || userMsg.slice(0, 30), updated_at: new Date().toISOString() }
          : t
      ))
    } catch {
      setChatMsgs(m => [...m, { role: 'assistant', content: 'Error: Agent execution failed. Check your API configuration.' }])
    } finally { setRunning(false) }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
          <p className="mt-1 text-sm text-slate-500">LangChain ReAct agents with skill and credential bindings</p>
        </div>
        <button onClick={() => { setModal('create'); setStep(1) }} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
          <Plus size={14} /> New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(agents as any[]).map((agent: any) => (
          <div key={agent.id} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md"
            onClick={() => { setModal({ type: 'chat', agentId: agent.id }); setChatMsgs([]); setThreads([]); setActiveThreadId(null) }}>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xl">🤖</div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{agent.name}</p>
                  <p className="text-[11px] text-slate-500">{agent.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={e => { e.stopPropagation(); openEditModal(agent.id) }} className="p-1 text-slate-400 hover:text-violet-600 transition-colors" title="Edit"><Pencil size={13} /></button>
                <button onClick={e => { e.stopPropagation(); deleteMut.mutate(agent.id) }} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="mb-3 flex gap-1.5 flex-wrap">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{agent.model_name}</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">temp {agent.temperature}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{agent.is_active ? 'active' : 'inactive'}</span>
            </div>
            <p className="text-[11px] text-emerald-500 font-medium">Click to chat →</p>
          </div>
        ))}
      </div>

      {/* Create Agent Modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={() => setModal(null)}>
          <div className="flex w-full max-w-2xl mx-4 sm:mx-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xl max-h-[95vh] sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Create New Agent</h2>
                <div className="mt-2 flex items-center gap-1.5">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex items-center gap-1.5">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-slate-400'}`}>
                        {step > n ? '✓' : n}
                      </div>
                      {n < 3 && <div className={`h-px w-8 ${step > n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                    </div>
                  ))}
                  <span className="ml-2 text-xs text-slate-500">{['', 'Configure', 'Attach Skills', 'Review'][step]}</span>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {step === 1 && (
                <div className="space-y-4">
                  {/* Quick Start Templates */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      <Zap size={11} /> Quick Start
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {AGENT_TEMPLATES.map(tpl => (
                        <button key={tpl.name} onClick={() => applyTemplate(tpl)}
                          className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm">
                          <span className="text-xl">{tpl.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-700 truncate">{tpl.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{tpl.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {[{ k: 'name', l: 'Agent Name', ph: 'Azure Monitor Bot' }, { k: 'description', l: 'Description', ph: 'What does this agent do?' }].map(f => (
                    <div key={f.k}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{f.l}</label>
                      <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder={f.ph} value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">System Prompt</label>
                      {form.skill_bindings.length > 0 && (
                        <button onClick={() => setForm({ ...form, system_prompt: generatePromptFromSkills(form.skill_bindings) })}
                          className="flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 hover:bg-violet-100 transition-colors">
                          <Sparkles size={10} /> Auto-generate
                        </button>
                      )}
                    </div>
                    <textarea rows={4} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Model</label>
                      <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                        value={form.model_name} onChange={e => setForm({ ...form, model_name: e.target.value })}>
                        <option value="claude-opus">Claude Opus (Most Capable)</option>
                        <option value="claude-sonnet">Claude Sonnet (Balanced)</option>
                        <option value="claude-haiku">Claude Haiku (Fast)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Temperature ({form.temperature})</label>
                      <input type="range" min="0" max="1" step="0.1" className="w-full mt-2 accent-emerald-500" value={form.temperature}
                        onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
                    Next: Attach Skills →
                  </button>
                </div>
              )}
              {step === 2 && (
                <div>
                  <p className="mb-4 text-sm text-slate-500">Select skills and bind a credential. Credentials are matched by auth type.</p>
                  {(catalog as any[]).map((cat: any) => (
                    <div key={cat.id} className="mb-5">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span>{cat.icon}</span>{cat.name}
                        <span className="ml-auto text-xs text-emerald-500">{form.skill_bindings.filter(b => allSkills.find(s => s.id === b.skillId)?.catId === cat.id).length} selected</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.tags.flatMap((t: any) => t.skills).slice(0, 8).map((sk: any) => {
                          const isAdded = form.skill_bindings.some(b => b.skillId === sk.id)
                          const binding = form.skill_bindings.find(b => b.skillId === sk.id)
                          const needsCred = cat.credType && cat.credType !== 'generic'
                          const compatCreds = (credentials as any[]).filter((c: any) => c.auth_type === cat.credType)
                          const hasBoundCred = binding?.credentialId && compatCreds.some((c: any) => c.id === binding.credentialId)
                          return (
                            <div key={sk.id} className={`rounded-lg border p-2.5 transition-all ${isAdded ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 cursor-pointer'}`}
                              onClick={() => !isAdded && toggleSkill(sk)}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span>{sk.icon}</span>
                                <span className="text-[11.5px] font-semibold text-slate-700 flex-1">{sk.label}</span>
                                {isAdded && hasBoundCred && (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                                    <Check size={10} className="text-white" />
                                  </span>
                                )}
                                {isAdded && <button onClick={e => { e.stopPropagation(); toggleSkill(sk) }} className="text-slate-400 hover:text-red-500 text-xs">✕</button>}
                              </div>
                              {isAdded && needsCred && compatCreds.length > 0 && (
                                <select onClick={e => e.stopPropagation()} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                                  value={binding?.credentialId || ''} onChange={e => bindCred(sk.id, e.target.value)}>
                                  <option value="">Bind credential...</option>
                                  {compatCreds.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}{c.auth_category ? ` (${c.auth_category})` : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {isAdded && needsCred && compatCreds.length === 0 && (
                                <Link href="/credentials" onClick={e => e.stopPropagation()}
                                  className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
                                  <AlertTriangle size={10} /> No matching credential &mdash; Add one &rarr;
                                </Link>
                              )}
                              {isAdded && !needsCred && <span className="text-[10px] text-emerald-600">No auth needed</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">← Back</button>
                    <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
                      Review ({form.skill_bindings.length} skills) →
                    </button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                    {[['Name', form.name || '(unnamed)'], ['Model', form.model_name], ['Temperature', form.temperature]].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-0">
                        <span className="text-slate-500">{k}</span><strong className="text-slate-800">{v as any}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills & Credentials ({form.skill_bindings.length})</label>
                    <div className="space-y-1.5">
                      {form.skill_bindings.map(b => {
                        const sk = allSkills.find(s => s.id === b.skillId)
                        const cred = (credentials as any[]).find((c: any) => c.id === b.credentialId)
                        const needsCred = sk?.credType === 'azure' || sk?.credType === 'entra'
                        return sk ? (
                          <div key={b.skillId} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${needsCred && !cred ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                            <span>{sk.icon}</span><span className="flex-1 font-medium text-slate-700">{sk.label}</span>
                            {cred ? <span className="text-[10.5px] text-emerald-600">{(cred as any).name}</span> : needsCred ? <span className="text-[10px] text-red-500">No credential</span> : <span className="text-[10px] text-slate-400">No auth</span>}
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">← Back</button>
                    <button
                      onClick={() => createMut.mutate({ ...form, skill_bindings: form.skill_bindings.map(b => ({ skill_id: b.skillId, skill_name: b.skillName, credential_id: b.credentialId })) })}
                      disabled={createMut.isPending}
                      className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {createMut.isPending ? <><Loader2 size={13} className="animate-spin" />Creating...</> : 'Create Agent'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal – Two-Panel Layout */}
      {modal && typeof modal === 'object' && modal.type === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={() => setModal(null)}>
          <div className="flex w-full max-w-3xl mx-4 rounded-xl border border-slate-200 bg-white shadow-xl h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* LEFT PANEL – Thread List */}
            <div className="flex w-48 flex-col border-r border-slate-200 bg-slate-50 rounded-l-xl">
              <div className="p-3 border-b border-slate-200">
                <button onClick={createNewThread}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 transition-colors">
                  <Plus size={12} /> New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threadsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  </div>
                ) : threads.length === 0 ? (
                  <p className="p-3 text-[11px] text-slate-400 text-center">No threads yet</p>
                ) : (
                  threads.map(thread => (
                    <div key={thread.id}
                      onClick={() => loadThread(thread.id)}
                      className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-100 ${activeThreadId === thread.id ? 'bg-violet-100 border-violet-200' : 'hover:bg-slate-100'}`}>
                      <MessageSquare size={12} className={`mt-0.5 shrink-0 ${activeThreadId === thread.id ? 'text-violet-600' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium truncate ${activeThreadId === thread.id ? 'text-violet-700' : 'text-slate-700'}`}>
                          {thread.title || 'New chat'}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatTimeAgo(thread.updated_at || thread.created_at)}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteThread(thread.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all shrink-0">
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANEL – Chat Area */}
            <div className="flex flex-1 flex-col rounded-r-xl">
              <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                <span className="text-2xl">🤖</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{(agents as any[]).find((a: any) => a.id === (modal as any).agentId)?.name}</p>
                  <p className="text-[11px] text-slate-500">Claude Native Tool Use</p>
                </div>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatMsgs.length === 0 && !running && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <MessageSquare size={28} className="mb-2 opacity-40" />
                    <p className="text-sm">Start a conversation</p>
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm font-mono text-[12px]'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {running && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-slate-500">
                      <Loader2 size={13} className="animate-spin" /> Executing skills via LangChain...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2 border-t border-slate-200 p-3">
                <input className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ask your agent..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  disabled={!activeThreadId} />
                <button onClick={sendChat} disabled={running || !activeThreadId} className="rounded-lg bg-emerald-500 px-3 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Agent Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={closeEditModal}>
          <div className="flex w-full max-w-2xl mx-4 flex-col rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Edit Agent</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{editAgent.name}</p>
              </div>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              {(['general', 'skills', 'advanced'] as const).map(tab => (
                <button key={tab} onClick={() => setEditTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${editTab === tab ? 'border-b-2 border-violet-600 text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── General Tab ── */}
              {editTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Agent Name</label>
                    <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">System Prompt</label>
                    <textarea className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none min-h-[120px]"
                      rows={5} value={editForm.system_prompt} onChange={e => setEditForm({ ...editForm, system_prompt: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Model</label>
                      <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                        value={editForm.model_name} onChange={e => setEditForm({ ...editForm, model_name: e.target.value })}>
                        <option value="claude-opus">Claude Opus (Most Capable)</option>
                        <option value="claude-sonnet">Claude Sonnet (Balanced)</option>
                        <option value="claude-haiku">Claude Haiku (Fast)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Temperature ({editForm.temperature})</label>
                      <input type="range" min="0" max="1" step="0.1" className="w-full mt-2 accent-violet-500" value={editForm.temperature}
                        onChange={e => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <button onClick={saveEditForm} disabled={editSaving}
                    className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {editSaving ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
                      : editSuccess ? <><CheckCircle size={13} /> Saved!</>
                      : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* ── Skills Tab ── */}
              {editTab === 'skills' && (
                <div className="space-y-5">
                  {/* Installed Skills */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Installed Skills ({agentSkills.length})
                    </label>
                    {agentSkills.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No skills installed yet</p>
                    ) : (
                      <div className="space-y-2">
                        {agentSkills.map((sk: any) => (
                          <div key={sk.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-800">{sk.skill_name || sk.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SKILL_TYPE_BADGE_COLORS[sk.skill_type] || 'bg-slate-100 text-slate-600'}`}>
                                  {sk.skill_type || 'Custom'}
                                </span>
                              </div>
                              {sk.config_json && (
                                <p className="text-[11px] text-slate-500 font-mono truncate">
                                  {(typeof sk.config_json === 'string' ? sk.config_json : JSON.stringify(sk.config_json)).slice(0, 40)}...
                                </p>
                              )}
                            </div>
                            {skillDeleteConfirm === sk.id ? (
                              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                <button onClick={() => removeAgentSkill(sk.id)}
                                  className="rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700 transition-colors">
                                  Confirm
                                </button>
                                <button onClick={() => setSkillDeleteConfirm(null)}
                                  className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setSkillDeleteConfirm(sk.id)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-3">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Skill */}
                  <div className="border-t border-slate-200 pt-5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Add New Skill</label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Skill Name</label>
                          <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                            placeholder="e.g. Fetch Weather"
                            value={newSkill.skill_name} onChange={e => setNewSkill({ ...newSkill, skill_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Skill Type</label>
                          <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                            value={newSkill.skill_type} onChange={e => setNewSkill({ ...newSkill, skill_type: e.target.value, config_json: '' })}>
                            <option>REST API</option>
                            <option>SQL Query</option>
                            <option>Python Function</option>
                            <option>Web Scraper</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Config JSON</label>
                        <textarea className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                          rows={4}
                          placeholder={SKILL_TYPE_PLACEHOLDERS[newSkill.skill_type] || '{}'}
                          value={newSkill.config_json} onChange={e => setNewSkill({ ...newSkill, config_json: e.target.value })} />
                      </div>
                      <button onClick={addAgentSkill} disabled={skillAdding || !newSkill.skill_name.trim()}
                        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {skillAdding ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : <><Plus size={13} /> Add Skill</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Advanced Tab ── */}
              {editTab === 'advanced' && (
                <div className="space-y-5">
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Danger Zone</h3>
                    <p className="text-[12px] text-red-600 mb-4">Permanently delete this agent and all its conversations. This action cannot be undone.</p>
                    {deleteConfirmAgent ? (
                      <div className="space-y-3">
                        <p className="text-[12px] font-semibold text-red-700">Are you sure? This will delete all conversations.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirmAgent(false)}
                            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
                            Cancel
                          </button>
                          <button onClick={deleteAgentFull}
                            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                            <Trash2 size={13} /> Delete Agent
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmAgent(true)}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2">
                        <Trash2 size={13} /> Delete Agent
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
