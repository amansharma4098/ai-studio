'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bot, Send, Trash2, Loader2, CheckCircle, Sparkles, Zap, AlertTriangle, Check, MessageSquare, X, Pencil, Rocket } from 'lucide-react'
import { agentsApi, skillsApi, credentialsApi, threadsApi } from '@/lib/api'
import Link from 'next/link'
import { ModelSelector } from '@/components/ui/ModelSelector'

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
    model_name: 'anthropic/claude-sonnet',
    temperature: 0.3,
    skillPatterns: ['sql_query', 'data_analysis'],
  },
  {
    name: 'Web Researcher',
    icon: '🔍',
    description: 'Researches topics online and summarizes findings',
    system_prompt: 'You research topics online and summarize findings clearly.',
    model_name: 'anthropic/claude-sonnet',
    temperature: 0.5,
    skillPatterns: ['web_scraping', 'rest_api'],
  },
  {
    name: 'Email Assistant',
    icon: '✉️',
    description: 'Drafts professional emails and communications',
    system_prompt: 'You draft professional emails and communications.',
    model_name: 'anthropic/claude-sonnet',
    temperature: 0.7,
    skillPatterns: ['email'],
  },
  {
    name: 'General Assistant',
    icon: '🤖',
    description: 'A helpful assistant for general questions',
    system_prompt: 'You are a helpful assistant that answers questions.',
    model_name: 'anthropic/claude-sonnet',
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
  const [form, setForm] = useState({ name: '', description: '', system_prompt: 'You are a helpful Microsoft 365 and Azure assistant.', model_name: 'anthropic/claude-sonnet', temperature: 0.7, memory_enabled: true, skill_bindings: [] as SkillBinding[] })
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setModal(null); setStep(1); setForm({ name: '', description: '', system_prompt: 'You are a helpful Microsoft 365 and Azure assistant.', model_name: 'anthropic/claude-sonnet', temperature: 0.7, memory_enabled: true, skill_bindings: [] }) },
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
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen animate-fade-in" style={{ background: '#0a0a0f' }}>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text" style={{ color: '#00f0ff', textShadow: '0 0 10px rgba(0,240,255,0.5), 0 0 30px rgba(0,240,255,0.2)' }}>
            Agents
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Multi-model AI agents with skill and credential bindings</p>
        </div>
        <button onClick={() => { setModal('create'); setStep(1) }}
          className="game-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)',
            color: '#0a0a0f',
            boxShadow: '0 0 20px rgba(0,240,255,0.3), 0 0 40px rgba(139,92,246,0.2)',
            border: '1px solid rgba(0,240,255,0.4)',
          }}>
          <Plus size={14} /> New Agent
        </button>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(agents as any[]).map((agent: any) => (
          <div key={agent.id}
            className="game-card cursor-pointer rounded-xl p-5 transition-all duration-300 animate-fade-in"
            style={{
              background: 'linear-gradient(145deg, #12121a 0%, #0f0f18 100%)',
              border: `1px solid ${agent.is_active ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow: agent.is_active
                ? '0 0 20px rgba(0,255,136,0.08), inset 0 1px 0 rgba(0,255,136,0.1)'
                : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
              opacity: agent.is_active ? 1 : 0.7,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.border = `1px solid ${agent.is_active ? 'rgba(0,255,136,0.4)' : 'rgba(0,240,255,0.3)'}`
              ;(e.currentTarget as HTMLElement).style.boxShadow = agent.is_active
                ? '0 0 30px rgba(0,255,136,0.15), 0 0 60px rgba(0,255,136,0.05), inset 0 1px 0 rgba(0,255,136,0.15)'
                : '0 0 25px rgba(0,240,255,0.1), 0 0 50px rgba(139,92,246,0.05), inset 0 1px 0 rgba(0,240,255,0.1)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.border = `1px solid ${agent.is_active ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`
              ;(e.currentTarget as HTMLElement).style.boxShadow = agent.is_active
                ? '0 0 20px rgba(0,255,136,0.08), inset 0 1px 0 rgba(0,255,136,0.1)'
                : '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
            }}
            onClick={() => { setModal({ type: 'chat', agentId: agent.id }); setChatMsgs([]); setThreads([]); setActiveThreadId(null) }}>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                  style={{
                    background: agent.is_active ? 'rgba(0,255,136,0.1)' : 'rgba(139,92,246,0.1)',
                    border: `1px solid ${agent.is_active ? 'rgba(0,255,136,0.2)' : 'rgba(139,92,246,0.2)'}`,
                    boxShadow: agent.is_active ? '0 0 15px rgba(0,255,136,0.1)' : 'none',
                  }}>
                  <Bot size={20} style={{ color: agent.is_active ? '#00ff88' : '#8b5cf6' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{agent.name}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={e => { e.stopPropagation(); openEditModal(agent.id) }}
                  className="p-1.5 rounded transition-all duration-200"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  title="Edit"><Pencil size={13} /></button>
                <button onClick={e => { e.stopPropagation(); deleteMut.mutate(agent.id) }}
                  className="p-1.5 rounded transition-all duration-200"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff4466'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,102,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="mb-4 flex gap-2 flex-wrap">
              <span className="badge-info rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>
                {agent.model_name}
              </span>
              <span className="badge-purple rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                temp {agent.temperature}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={agent.is_active
                  ? { background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', boxShadow: '0 0 8px rgba(0,255,136,0.2)', animation: 'pulse 2s infinite' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
                }>
                {agent.is_active ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold" style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0,240,255,0.3)' }}>
                LAUNCH COMMS &rarr;
              </p>
              <Link href="/deployments" onClick={e => e.stopPropagation()}
                className="game-btn-secondary flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold transition-all duration-200"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(139,92,246,0.2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                <Rocket size={10} /> Deploy
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════ Create Agent Modal ══════════════════════ */}
      {modal === 'create' && (
        <div className="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}>
          <div className="game-modal flex w-full max-w-2xl mx-4 sm:mx-0 flex-col rounded-xl max-h-[95vh] sm:max-h-[90vh] animate-fade-in"
            style={{
              background: 'linear-gradient(145deg, #12121a 0%, #0a0a0f 100%)',
              border: '1px solid rgba(0,240,255,0.15)',
              boxShadow: '0 0 40px rgba(0,240,255,0.1), 0 0 80px rgba(139,92,246,0.05), 0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Header with Step Indicators */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#00f0ff', textShadow: '0 0 10px rgba(0,240,255,0.4)' }}>
                  Create New Agent
                </h2>
                <div className="mt-3 flex items-center gap-1.5">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-all duration-300"
                        style={step >= n
                          ? {
                              background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
                              color: '#0a0a0f',
                              boxShadow: '0 0 12px rgba(0,240,255,0.4), 0 0 24px rgba(139,92,246,0.2)',
                            }
                          : {
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.25)',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }
                        }>
                        {step > n ? '\u2713' : n}
                      </div>
                      {n < 3 && <div className="h-px w-8 transition-all duration-300" style={{ background: step > n ? 'linear-gradient(90deg, #00f0ff, #8b5cf6)' : 'rgba(255,255,255,0.06)', boxShadow: step > n ? '0 0 6px rgba(0,240,255,0.3)' : 'none' }} />}
                    </div>
                  ))}
                  <span className="ml-3 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {['', 'Configure', 'Attach Skills', 'Review'][step]}
                  </span>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-lg transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4466'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
                \u2715
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ── Step 1: Configure ── */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Quick Start Templates (Loadout Presets) */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-3"
                      style={{ color: '#8b5cf6', textShadow: '0 0 8px rgba(139,92,246,0.3)' }}>
                      <Zap size={11} /> Loadout Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {AGENT_TEMPLATES.map(tpl => (
                        <button key={tpl.name} onClick={() => applyTemplate(tpl)}
                          className="flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-left transition-all duration-200"
                          style={{
                            background: 'rgba(139,92,246,0.05)',
                            border: '1px solid rgba(139,92,246,0.12)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'
                            ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.3)'
                            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(139,92,246,0.15)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)'
                            ;(e.currentTarget as HTMLElement).style.border = '1px solid rgba(139,92,246,0.12)'
                            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                          }}>
                          <span className="text-xl">{tpl.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold truncate" style={{ color: '#e2e8f0' }}>{tpl.name}</p>
                            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{tpl.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                  {[{ k: 'name', l: 'Agent Name', ph: 'Azure Monitor Bot' }, { k: 'description', l: 'Description', ph: 'What does this agent do?' }].map(f => (
                    <div key={f.k}>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.l}</label>
                      <input className="game-input w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#e2e8f0',
                        }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.1)' }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                        placeholder={f.ph} value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
                    </div>
                  ))}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>System Prompt</label>
                      {form.skill_bindings.length > 0 && (
                        <button onClick={() => setForm({ ...form, system_prompt: generatePromptFromSkills(form.skill_bindings) })}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold transition-all duration-200"
                          style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(139,92,246,0.2)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                          <Sparkles size={10} /> Auto-generate
                        </button>
                      )}
                    </div>
                    <textarea rows={4}
                      className="game-input w-full rounded-lg px-3.5 py-2.5 font-mono text-[12px] focus:outline-none resize-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.1)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                      value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Model</label>
                      <ModelSelector value={form.model_name} onChange={(v) => setForm({ ...form, model_name: v })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Temperature (<span style={{ color: '#00f0ff' }}>{form.temperature}</span>)
                      </label>
                      <input type="range" min="0" max="1" step="0.1" className="w-full mt-2" value={form.temperature}
                        onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                        style={{ accentColor: '#00f0ff' }} />
                    </div>
                  </div>

                  <button onClick={() => setStep(2)}
                    className="game-btn w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)',
                      color: '#0a0a0f',
                      boxShadow: '0 0 20px rgba(0,240,255,0.2)',
                      border: '1px solid rgba(0,240,255,0.3)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,240,255,0.4), 0 0 60px rgba(139,92,246,0.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,240,255,0.2)'}>
                    Next: Attach Skills &rarr;
                  </button>
                </div>
              )}

              {/* ── Step 2: Attach Skills (Equipment Slots) ── */}
              {step === 2 && (
                <div>
                  <p className="mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select skills and bind a credential. Credentials are matched by auth type.</p>
                  {(catalog as any[]).map((cat: any) => (
                    <div key={cat.id} className="mb-5">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: '#e2e8f0' }}>
                        <span>{cat.icon}</span>{cat.name}
                        <span className="ml-auto text-xs font-bold" style={{ color: '#00f0ff', textShadow: '0 0 6px rgba(0,240,255,0.3)' }}>
                          {form.skill_bindings.filter(b => allSkills.find(s => s.id === b.skillId)?.catId === cat.id).length} equipped
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.tags.flatMap((t: any) => t.skills).slice(0, 8).map((sk: any) => {
                          const isAdded = form.skill_bindings.some(b => b.skillId === sk.id)
                          const binding = form.skill_bindings.find(b => b.skillId === sk.id)
                          const needsCred = cat.credType && cat.credType !== 'generic'
                          const compatCreds = (credentials as any[]).filter((c: any) => c.auth_type === cat.credType)
                          const hasBoundCred = binding?.credentialId && compatCreds.some((c: any) => c.id === binding.credentialId)
                          return (
                            <div key={sk.id}
                              className="rounded-lg p-3 transition-all duration-200 cursor-pointer"
                              style={isAdded
                                ? {
                                    background: 'rgba(0,255,136,0.05)',
                                    border: '1px solid rgba(0,255,136,0.3)',
                                    boxShadow: '0 0 12px rgba(0,255,136,0.08), inset 0 0 20px rgba(0,255,136,0.02)',
                                  }
                                : {
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                  }
                              }
                              onMouseEnter={e => {
                                if (!isAdded) {
                                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,240,255,0.2)'
                                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,240,255,0.03)'
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isAdded) {
                                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.06)'
                                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                                }
                              }}
                              onClick={() => !isAdded && toggleSkill(sk)}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span>{sk.icon}</span>
                                <span className="text-[11.5px] font-bold flex-1" style={{ color: isAdded ? '#00ff88' : '#e2e8f0' }}>{sk.label}</span>
                                {isAdded && hasBoundCred && (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full"
                                    style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.4)' }}>
                                    <Check size={10} style={{ color: '#0a0a0f' }} />
                                  </span>
                                )}
                                {isAdded && <button onClick={e => { e.stopPropagation(); toggleSkill(sk) }}
                                  className="text-xs transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.3)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4466'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
                                  \u2715
                                </button>}
                              </div>
                              {isAdded && needsCred && compatCreds.length > 0 && (
                                <select onClick={e => e.stopPropagation()}
                                  className="mt-1 w-full rounded px-2 py-1 text-[11px] focus:outline-none"
                                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
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
                                  className="mt-1 flex items-center gap-1 text-[10px] font-semibold transition-colors duration-200"
                                  style={{ color: '#ffaa00' }}>
                                  <AlertTriangle size={10} /> No matching credential &mdash; Add one &rarr;
                                </Link>
                              )}
                              {isAdded && !needsCred && <span className="text-[10px] font-semibold" style={{ color: '#00ff88' }}>No auth needed</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setStep(1)}
                      className="game-btn-secondary flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}>
                      &larr; Back
                    </button>
                    <button onClick={() => setStep(3)}
                      className="game-btn flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-300"
                      style={{
                        background: 'linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)',
                        color: '#0a0a0f',
                        boxShadow: '0 0 20px rgba(0,240,255,0.2)',
                        border: '1px solid rgba(0,240,255,0.3)',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,240,255,0.4)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,240,255,0.2)'}>
                      Review ({form.skill_bindings.length} skills) &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Review ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg p-4 space-y-2"
                    style={{ background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.1)' }}>
                    {[['Name', form.name || '(unnamed)'], ['Model', form.model_name], ['Temperature', form.temperature]].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                        <strong style={{ color: '#00f0ff' }}>{v as any}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Equipment Loadout ({form.skill_bindings.length})
                    </label>
                    <div className="space-y-1.5">
                      {form.skill_bindings.map(b => {
                        const sk = allSkills.find(s => s.id === b.skillId)
                        const cred = (credentials as any[]).find((c: any) => c.id === b.credentialId)
                        const needsCred = sk?.credType === 'azure' || sk?.credType === 'entra'
                        return sk ? (
                          <div key={b.skillId} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                            style={needsCred && !cred
                              ? { background: 'rgba(255,68,102,0.05)', border: '1px solid rgba(255,68,102,0.2)' }
                              : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }
                            }>
                            <span>{sk.icon}</span>
                            <span className="flex-1 font-semibold" style={{ color: '#e2e8f0' }}>{sk.label}</span>
                            {cred ? <span className="text-[10.5px] font-semibold" style={{ color: '#00ff88' }}>{(cred as any).name}</span>
                              : needsCred ? <span className="text-[10px] font-semibold" style={{ color: '#ff4466' }}>No credential</span>
                              : <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No auth</span>}
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(2)}
                      className="game-btn-secondary flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}>
                      &larr; Back
                    </button>
                    <button
                      onClick={() => createMut.mutate({ ...form, skill_bindings: form.skill_bindings.map(b => ({ skill_id: b.skillId, skill_name: b.skillName, credential_id: b.credentialId })) })}
                      disabled={createMut.isPending}
                      className="game-btn flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #00ff88 0%, #00f0ff 100%)',
                        color: '#0a0a0f',
                        boxShadow: '0 0 20px rgba(0,255,136,0.2)',
                        border: '1px solid rgba(0,255,136,0.3)',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,255,136,0.4), 0 0 60px rgba(0,240,255,0.2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,255,136,0.2)'}
                    >
                      {createMut.isPending ? <><Loader2 size={13} className="animate-spin" />Deploying...</> : 'Deploy Agent'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ Chat Modal (Comms Terminal) ══════════════════════ */}
      {modal && typeof modal === 'object' && modal.type === 'chat' && (
        <div className="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}>
          <div className="game-modal flex w-full max-w-3xl mx-4 rounded-xl h-[85vh] animate-fade-in"
            style={{
              background: '#0a0a0f',
              border: '1px solid rgba(0,240,255,0.12)',
              boxShadow: '0 0 40px rgba(0,240,255,0.08), 0 0 80px rgba(139,92,246,0.04), 0 25px 50px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* LEFT PANEL - Thread List */}
            <div className="flex w-48 flex-col rounded-l-xl" style={{ background: '#0f0f18', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={createNewThread}
                  className="game-btn flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ff00aa 100%)',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(139,92,246,0.2)',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(139,92,246,0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(139,92,246,0.2)'}>
                  <Plus size={12} /> New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threadsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 size={14} className="animate-spin" style={{ color: '#00f0ff' }} />
                  </div>
                ) : threads.length === 0 ? (
                  <p className="p-3 text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>No threads yet</p>
                ) : (
                  threads.map(thread => (
                    <div key={thread.id}
                      onClick={() => loadThread(thread.id)}
                      className="group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-all duration-200"
                      style={{
                        background: activeThreadId === thread.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        borderLeft: activeThreadId === thread.id ? '2px solid #8b5cf6' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (activeThreadId !== thread.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (activeThreadId !== thread.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <MessageSquare size={12} className="mt-0.5 shrink-0" style={{ color: activeThreadId === thread.id ? '#8b5cf6' : 'rgba(255,255,255,0.2)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: activeThreadId === thread.id ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>
                          {thread.title || 'New chat'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{formatTimeAgo(thread.updated_at || thread.created_at)}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteThread(thread.id) }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 transition-all duration-200 shrink-0"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4466'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'}>
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANEL - Chat Area (Terminal) */}
            <div className="flex flex-1 flex-col rounded-r-xl">
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,240,255,0.02)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', boxShadow: '0 0 10px rgba(0,240,255,0.15)' }}>
                  <Bot size={16} style={{ color: '#00f0ff' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{(agents as any[]).find((a: any) => a.id === (modal as any).agentId)?.name}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(0,240,255,0.5)' }}>COMMS CHANNEL ACTIVE</p>
                </div>
                <button onClick={() => setModal(null)} className="transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4466'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
                  \u2715
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#0a0a0f' }}>
                {chatMsgs.length === 0 && !running && (
                  <div className="flex flex-col items-center justify-center h-full" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    <MessageSquare size={28} className="mb-2 opacity-40" />
                    <p className="text-sm font-semibold">Initialize communication</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.1)' }}>Type a message to begin transmission</p>
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                      style={m.role === 'user'
                        ? {
                            background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))',
                            color: '#e2e8f0',
                            border: '1px solid rgba(0,240,255,0.2)',
                            borderBottomRightRadius: '4px',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            color: '#00ff88',
                            border: '1px solid rgba(0,255,136,0.1)',
                            borderBottomLeftRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            textShadow: '0 0 8px rgba(0,255,136,0.15)',
                          }
                      }>
                      {m.content}
                    </div>
                  </div>
                ))}
                {running && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
                      style={{
                        background: 'rgba(0,255,136,0.03)',
                        border: '1px solid rgba(0,255,136,0.1)',
                        color: '#00ff88',
                        animation: 'pulse 1.5s infinite',
                      }}>
                      <Loader2 size={13} className="animate-spin" /> Processing signal via LangChain...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,240,255,0.02)' }}>
                <input className="game-input flex-1 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.1)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="Transmit message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  disabled={!activeThreadId} />
                <button onClick={sendChat} disabled={running || !activeThreadId}
                  className="game-btn rounded-lg px-3.5 transition-all duration-200 disabled:opacity-30"
                  style={{
                    background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
                    color: '#0a0a0f',
                    boxShadow: '0 0 12px rgba(0,240,255,0.2)',
                    border: '1px solid rgba(0,240,255,0.3)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,240,255,0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,240,255,0.2)'}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ Edit Agent Modal ══════════════════════ */}
      {editAgent && (
        <div className="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={closeEditModal}>
          <div className="game-modal flex w-full max-w-2xl mx-4 flex-col rounded-xl max-h-[90vh] animate-fade-in"
            style={{
              background: 'linear-gradient(145deg, #12121a 0%, #0a0a0f 100%)',
              border: '1px solid rgba(139,92,246,0.15)',
              boxShadow: '0 0 40px rgba(139,92,246,0.1), 0 0 80px rgba(0,240,255,0.04), 0 25px 50px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#8b5cf6', textShadow: '0 0 10px rgba(139,92,246,0.4)' }}>Edit Agent</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{editAgent.name}</p>
              </div>
              <button onClick={closeEditModal} className="transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff4466'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {(['general', 'skills', 'advanced'] as const).map(tab => (
                <button key={tab} onClick={() => setEditTab(tab)}
                  className="px-4 py-3 text-sm font-bold capitalize transition-all duration-200"
                  style={editTab === tab
                    ? { color: '#8b5cf6', borderBottom: '2px solid #8b5cf6', textShadow: '0 0 8px rgba(139,92,246,0.3)' }
                    : { color: 'rgba(255,255,255,0.3)', borderBottom: '2px solid transparent' }
                  }
                  onMouseEnter={e => { if (editTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
                  onMouseLeave={e => { if (editTab !== tab) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── General Tab ── */}
              {editTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Agent Name</label>
                    <input className="game-input w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(139,92,246,0.1)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                      value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>System Prompt</label>
                    <textarea className="game-input w-full rounded-lg px-3.5 py-2.5 font-mono text-[12px] focus:outline-none resize-none min-h-[120px] transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(139,92,246,0.1)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                      rows={5} value={editForm.system_prompt} onChange={e => setEditForm({ ...editForm, system_prompt: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Model</label>
                      <select className="game-input w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                        value={editForm.model_name} onChange={e => setEditForm({ ...editForm, model_name: e.target.value })}>
                        <option value="claude-opus">Claude Opus (Most Capable)</option>
                        <option value="claude-sonnet">Claude Sonnet (Balanced)</option>
                        <option value="claude-haiku">Claude Haiku (Fast)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Temperature (<span style={{ color: '#8b5cf6' }}>{editForm.temperature}</span>)
                      </label>
                      <input type="range" min="0" max="1" step="0.1" className="w-full mt-2" value={editForm.temperature}
                        onChange={e => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                        style={{ accentColor: '#8b5cf6' }} />
                    </div>
                  </div>
                  <button onClick={saveEditForm} disabled={editSaving}
                    className="game-btn w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: editSuccess ? 'linear-gradient(135deg, #00ff88, #00f0ff)' : 'linear-gradient(135deg, #8b5cf6, #ff00aa)',
                      color: editSuccess ? '#0a0a0f' : '#fff',
                      boxShadow: editSuccess ? '0 0 20px rgba(0,255,136,0.3)' : '0 0 20px rgba(139,92,246,0.2)',
                      border: editSuccess ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(139,92,246,0.3)',
                    }}>
                    {editSaving ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
                      : editSuccess ? <><CheckCircle size={13} /> Saved!</>
                      : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* ── Skills Tab (Equipment Slots) ── */}
              {editTab === 'skills' && (
                <div className="space-y-5">
                  {/* Installed Skills */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: '#00f0ff', textShadow: '0 0 6px rgba(0,240,255,0.3)' }}>
                      Equipped Skills ({agentSkills.length})
                    </label>
                    {agentSkills.length === 0 ? (
                      <p className="text-sm py-4 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>No skills equipped yet</p>
                    ) : (
                      <div className="space-y-2">
                        {agentSkills.map((sk: any) => (
                          <div key={sk.id} className="rounded-lg p-3 flex justify-between items-center transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,240,255,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.06)'}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{sk.skill_name || sk.name}</span>
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                  style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                                  {sk.skill_type || 'Custom'}
                                </span>
                              </div>
                              {sk.config_json && (
                                <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  {(typeof sk.config_json === 'string' ? sk.config_json : JSON.stringify(sk.config_json)).slice(0, 40)}...
                                </p>
                              )}
                            </div>
                            {skillDeleteConfirm === sk.id ? (
                              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                <button onClick={() => removeAgentSkill(sk.id)}
                                  className="game-btn-danger rounded px-2.5 py-1 text-[10px] font-bold transition-all duration-200"
                                  style={{
                                    background: 'linear-gradient(135deg, #ff4466, #ff0044)',
                                    color: '#fff',
                                    boxShadow: '0 0 10px rgba(255,68,102,0.3)',
                                    border: '1px solid rgba(255,68,102,0.4)',
                                  }}>
                                  Confirm
                                </button>
                                <button onClick={() => setSkillDeleteConfirm(null)}
                                  className="game-btn-secondary rounded px-2.5 py-1 text-[10px] font-semibold transition-all duration-200"
                                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setSkillDeleteConfirm(sk.id)}
                                className="p-1.5 rounded transition-all duration-200 shrink-0 ml-3"
                                style={{ color: 'rgba(255,255,255,0.2)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff4466'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,102,0.1)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Skill */}
                  <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#00ff88', textShadow: '0 0 6px rgba(0,255,136,0.3)' }}>
                      Equip New Skill
                    </label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Skill Name</label>
                          <input className="game-input w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,255,136,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,136,0.1)' }}
                            onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                            placeholder="e.g. Fetch Weather"
                            value={newSkill.skill_name} onChange={e => setNewSkill({ ...newSkill, skill_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Skill Type</label>
                          <select className="game-input w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                            value={newSkill.skill_type} onChange={e => setNewSkill({ ...newSkill, skill_type: e.target.value, config_json: '' })}>
                            <option>REST API</option>
                            <option>SQL Query</option>
                            <option>Python Function</option>
                            <option>Web Scraper</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Config JSON</label>
                        <textarea className="game-input w-full rounded-lg px-3.5 py-2.5 font-mono text-[12px] focus:outline-none resize-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,255,136,0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,136,0.1)' }}
                          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                          rows={4}
                          placeholder={SKILL_TYPE_PLACEHOLDERS[newSkill.skill_type] || '{}'}
                          value={newSkill.config_json} onChange={e => setNewSkill({ ...newSkill, config_json: e.target.value })} />
                      </div>
                      <button onClick={addAgentSkill} disabled={skillAdding || !newSkill.skill_name.trim()}
                        className="game-btn w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, #00ff88, #00f0ff)',
                          color: '#0a0a0f',
                          boxShadow: '0 0 20px rgba(0,255,136,0.2)',
                          border: '1px solid rgba(0,255,136,0.3)',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,255,136,0.4)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,255,136,0.2)'}>
                        {skillAdding ? <><Loader2 size={13} className="animate-spin" /> Equipping...</> : <><Plus size={13} /> Equip Skill</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Advanced Tab (Danger Zone) ── */}
              {editTab === 'advanced' && (
                <div className="space-y-5">
                  <div className="rounded-lg p-5"
                    style={{
                      background: 'rgba(255,68,102,0.03)',
                      border: '1px solid rgba(255,68,102,0.15)',
                      boxShadow: '0 0 20px rgba(255,68,102,0.05), inset 0 0 30px rgba(255,68,102,0.02)',
                    }}>
                    <h3 className="text-sm font-bold mb-1" style={{ color: '#ff4466', textShadow: '0 0 8px rgba(255,68,102,0.3)' }}>Danger Zone</h3>
                    <p className="text-[12px] mb-4" style={{ color: 'rgba(255,68,102,0.7)' }}>Permanently delete this agent and all its conversations. This action cannot be undone.</p>
                    {deleteConfirmAgent ? (
                      <div className="space-y-3">
                        <p className="text-[12px] font-bold" style={{ color: '#ff4466', animation: 'pulse 1.5s infinite' }}>
                          WARNING: This will delete all conversations.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirmAgent(false)}
                            className="game-btn-secondary flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                            Cancel
                          </button>
                          <button onClick={deleteAgentFull}
                            className="game-btn-danger flex-1 rounded-lg py-2 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
                            style={{
                              background: 'linear-gradient(135deg, #ff4466, #ff0044)',
                              color: '#fff',
                              boxShadow: '0 0 20px rgba(255,68,102,0.3), 0 0 40px rgba(255,0,68,0.15)',
                              border: '1px solid rgba(255,68,102,0.4)',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(255,68,102,0.5), 0 0 60px rgba(255,0,68,0.25)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(255,68,102,0.3), 0 0 40px rgba(255,0,68,0.15)'}>
                            <Trash2 size={13} /> Delete Agent
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmAgent(true)}
                        className="game-btn-danger rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 flex items-center gap-2"
                        style={{
                          background: 'rgba(255,68,102,0.1)',
                          color: '#ff4466',
                          border: '1px solid rgba(255,68,102,0.25)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,102,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(255,68,102,0.2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,102,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
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

      {/* Inline keyframe styles for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
