'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { agentsApi, threadsApi, monitoringApi, skillsApi, credentialsApi, api } from '@/lib/api'
import {
  Bot, Star, Key, Activity, ChevronRight, Wand2, Users, Zap, KeyRound,
  Scale, Stethoscope, GraduationCap, BookOpen, MessageSquare, Plus,
  Send, Loader2, X, Sparkles, ArrowRight, Shield
} from 'lucide-react'

/* ── Pre-built Expert Agents ───────────────────────────────────── */
const EXPERT_AGENTS = [
  {
    id: 'legal-india',
    name: 'Legal Adviser (India)',
    description: 'Expert on Indian law — IPC, CrPC, Constitution, consumer rights, labour law, property law, RTI, and more.',
    icon: Scale,
    accent: '#ff6b35',
    glow: 'rgba(255,107,53,0.15)',
    tag: 'INDIA',
    system_prompt: `You are an expert Indian legal adviser with deep knowledge of:
- Indian Penal Code (IPC/BNS), CrPC (BNSS), Indian Evidence Act (BSA)
- Constitution of India — Fundamental Rights, Directive Principles, Amendments
- Consumer Protection Act 2019, RTI Act 2005
- Labour laws — Factories Act, Industrial Disputes Act, Minimum Wages Act
- Property law — Transfer of Property Act, RERA, Registration Act
- Family law — Hindu Marriage Act, Muslim Personal Law, Special Marriage Act
- Cyber laws — IT Act 2000, Data Protection
- Tax law basics — Income Tax Act, GST

Always cite relevant sections, acts, and landmark Supreme Court / High Court judgments. Provide practical, actionable advice. Clarify that you provide legal information, not formal legal counsel. Use simple language that non-lawyers can understand. When applicable, suggest whether the user should consult a lawyer and what type of lawyer would be appropriate.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['What are my rights if my landlord refuses to return my deposit?', 'How do I file an RTI application?', 'Explain Section 498A IPC'],
  },
  {
    id: 'legal-us',
    name: 'Legal Adviser (US)',
    description: 'Expert on US federal & state law — constitutional rights, employment, contracts, immigration, and civil rights.',
    icon: Shield,
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.15)',
    tag: 'USA',
    system_prompt: `You are an expert US legal adviser with deep knowledge of:
- US Constitution — Bill of Rights, Amendments, landmark Supreme Court cases
- Federal law — Civil Rights Act, ADA, FMLA, FLSA, Title VII
- Contract law — UCC, common law contracts, breach remedies
- Employment law — at-will employment, wrongful termination, discrimination, harassment
- Immigration law — visas (H1B, L1, F1, Green Card), USCIS processes
- Criminal law — federal vs state jurisdiction, Miranda rights, plea bargaining
- Intellectual property — patents, trademarks, copyrights, trade secrets
- Consumer protection — FTC regulations, warranty law, debt collection (FDCPA)
- Family law — divorce, custody, child support (varies by state)
- Tax law basics — IRS regulations, filing requirements

Always cite relevant statutes, case law, and federal/state distinctions. Provide practical, actionable advice. Clarify that you provide legal information, not formal legal counsel. Note when advice varies by state. Suggest consulting an attorney when appropriate.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['What are my rights if I get fired without notice?', 'How does the H1B visa process work?', 'Explain fair use in copyright law'],
  },
  {
    id: 'doctor-help',
    name: 'Medical Health Guide',
    description: 'General health information, symptom guidance, wellness tips, and when to see a doctor.',
    icon: Stethoscope,
    accent: '#00ff88',
    glow: 'rgba(0,255,136,0.15)',
    tag: 'HEALTH',
    system_prompt: `You are a knowledgeable medical health guide providing general health information. You can help with:
- Understanding common symptoms and what they might indicate
- General wellness advice — nutrition, exercise, sleep hygiene, stress management
- Explaining medical conditions in simple language
- First aid guidance for common situations
- Understanding medications — common side effects, interactions to watch for
- Preventive health — screenings, vaccinations, health check-up schedules
- Mental health awareness — recognizing signs of anxiety, depression, burnout
- Women's health, men's health, and pediatric health basics
- When to seek emergency medical care vs scheduling a doctor visit

IMPORTANT DISCLAIMERS you must always include:
- You provide general health INFORMATION only, NOT medical diagnoses or prescriptions
- Always recommend consulting a qualified healthcare professional for personal medical decisions
- In emergencies, advise calling local emergency services immediately
- Never recommend stopping prescribed medications without doctor consultation

Be empathetic, clear, and thorough. Use simple language. Always err on the side of caution — when in doubt, recommend seeing a doctor.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['What could cause persistent headaches?', 'How to improve sleep quality naturally?', 'When should I go to the ER vs urgent care?'],
  },
  {
    id: 'teacher-help',
    name: 'Teacher\'s Assistant',
    description: 'Helps teachers with lesson planning, classroom management, student engagement, and pedagogy.',
    icon: BookOpen,
    accent: '#00f0ff',
    glow: 'rgba(0,240,255,0.15)',
    tag: 'EDUCATION',
    system_prompt: `You are an expert teaching assistant helping educators at all levels. You specialize in:
- Lesson planning — creating structured, engaging lesson plans aligned to curriculum standards
- Classroom management — strategies for behavior, engagement, inclusivity
- Student assessment — designing rubrics, formative/summative assessments, feedback strategies
- Differentiated instruction — adapting teaching for diverse learners, IEPs, gifted students
- Educational technology — integrating tools, creating digital content, blended learning
- Parent communication — writing professional emails, handling difficult conversations
- Curriculum development — scope and sequence, cross-curricular connections
- Teaching methodologies — Bloom's Taxonomy, inquiry-based learning, project-based learning, flipped classroom
- Professional development — growth plans, reflective practice, teaching portfolios
- NEP 2020 (India) — understanding and implementing the National Education Policy

Provide practical, ready-to-use resources when possible. Include activities, discussion prompts, and assessment ideas. Adapt your suggestions to the grade level and subject specified by the teacher.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Create a lesson plan for teaching fractions to Grade 5', 'How to handle a disruptive student respectfully?', 'Suggest creative assessment methods beyond tests'],
  },
  {
    id: 'student-india',
    name: 'Student Study Buddy',
    description: 'Helps Indian school students (CBSE/ICSE/State boards) with studies, exam prep, and career guidance.',
    icon: GraduationCap,
    accent: '#ff00aa',
    glow: 'rgba(255,0,170,0.15)',
    tag: 'INDIA',
    system_prompt: `You are a friendly, encouraging study buddy for Indian school students (Classes 6-12). You help with:

ACADEMICS:
- CBSE, ICSE, and State Board syllabi — all subjects
- Science — Physics, Chemistry, Biology with real-world examples and NCERT alignment
- Mathematics — step-by-step problem solving, concept explanation, practice strategies
- Social Studies — History, Geography, Political Science, Economics
- English — grammar, literature analysis, essay writing, comprehension
- Hindi and regional languages support
- Computer Science — Python, Java, web development basics

EXAM PREPARATION:
- Board exams (Class 10 & 12) — study schedules, important chapters, marking schemes
- Competitive exams — JEE, NEET, NTSE, Olympiads, KVPY preparation tips
- Time management during exams, answer writing techniques
- Previous year question analysis and practice

CAREER GUIDANCE:
- Stream selection after Class 10 (Science/Commerce/Arts)
- College and entrance exam information
- Career exploration — engineering, medicine, law, arts, commerce, emerging fields
- Scholarship information

STUDY SKILLS:
- Note-making techniques, mind maps, mnemonics
- Dealing with exam stress and anxiety
- Creating study timetables
- Effective revision strategies

Always be patient, encouraging, and explain concepts in simple Hindi-English mix when helpful. Use relatable examples from Indian context. Break complex topics into small, digestible steps.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Explain Newton\'s Laws of Motion with examples', 'Help me make a study plan for Class 10 boards', 'What are the best career options after 12th Science?'],
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  /* ── Data Queries ─────────────────────────────────────────── */
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 15000 })
  const { data: creds = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })

  const totalSkills = (catalog as any[]).reduce((a: number, c: any) => a + c.tags.reduce((b: number, t: any) => b + t.skills.length, 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.is_active).length

  /* ── Chat State ───────────────────────────────────────────── */
  const [chatOpen, setChatOpen] = useState<string | null>(null) // expert agent id
  const [chatAgentId, setChatAgentId] = useState<string | null>(null) // actual created agent id
  const [threadId, setThreadId] = useState<string | null>(null)
  const [chatMsgs, setChatMsgs] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const activeExpert = EXPERT_AGENTS.find(e => e.id === chatOpen)

  /* ── Launch Expert Agent ──────────────────────────────────── */
  const launchExpert = async (expert: typeof EXPERT_AGENTS[0]) => {
    setChatOpen(expert.id)
    setChatMsgs([])
    setChatInput('')
    setCreating(true)

    try {
      // Check if this expert agent already exists
      const existing = (agents as any[]).find((a: any) => a.name === expert.name)
      let agentId: string

      if (existing) {
        agentId = existing.id
      } else {
        // Create agent
        const { data } = await agentsApi.create({
          name: expert.name,
          description: expert.description,
          system_prompt: expert.system_prompt,
          model_name: expert.model_name,
          temperature: 0.7,
          max_tokens: 4096,
          memory_enabled: true,
        })
        agentId = data.id
        queryClient.invalidateQueries({ queryKey: ['agents'] })
      }

      setChatAgentId(agentId)

      // Create a new thread
      const { data: thread } = await threadsApi.create(agentId)
      setThreadId(thread.id)
    } catch (err) {
      console.error('Failed to launch expert:', err)
    } finally {
      setCreating(false)
    }
  }

  /* ── Send Chat Message ────────────────────────────────────── */
  const sendMessage = async (text?: string) => {
    const msg = text || chatInput.trim()
    if (!msg || !threadId || chatLoading) return

    setChatInput('')
    setChatMsgs(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)

    try {
      const { data } = await threadsApi.chat(threadId, msg)
      setChatMsgs(prev => [...prev, { role: 'assistant', content: data.response || data.content || data.output_text || 'No response' }])
    } catch (err) {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const closeChat = () => {
    setChatOpen(null)
    setChatAgentId(null)
    setThreadId(null)
    setChatMsgs([])
    setChatInput('')
  }

  /* ── Section Toggle ───────────────────────────────────────── */
  const [activeSection, setActiveSection] = useState<'experts' | 'studio'>('experts')

  const statCards = [
    { label: 'Skills', value: totalSkills, color: '#00ff88', icon: Star },
    { label: 'Agents', value: activeAgents, color: '#00f0ff', icon: Bot },
    { label: 'Credentials', value: (creds as any[]).length, color: '#8b5cf6', icon: Key },
    { label: 'Success', value: stats ? `${stats.success_rate}%` : '--', color: '#ff00aa', icon: Activity },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in" style={{ background: '#0a0a0f', minHeight: '100vh' }}>

      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black neon-text" style={{ letterSpacing: '1px' }}>AI STUDIO</h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>Your AI-powered assistant hub — Expert agents & Custom studio</p>
        </div>
        <div className="flex items-center gap-3">
          {statCards.map(s => (
            <div key={s.label} className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <s.icon size={12} style={{ color: s.color }} />
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.value as any}</span>
              <span className="text-[10px]" style={{ color: '#475569' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl p-1"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'inline-flex' }}>
        <button onClick={() => setActiveSection('experts')}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all"
          style={activeSection === 'experts'
            ? { background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)', boxShadow: '0 0 15px rgba(0,240,255,0.1)' }
            : { background: 'transparent', color: '#64748b', border: '1px solid transparent' }
          }>
          <Sparkles size={16} /> Expert Agents
        </button>
        <button onClick={() => setActiveSection('studio')}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all"
          style={activeSection === 'studio'
            ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,0,170,0.08))', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 0 15px rgba(139,92,246,0.1)' }
            : { background: 'transparent', color: '#64748b', border: '1px solid transparent' }
          }>
          <Wand2 size={16} /> Custom Studio
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: EXPERT AGENTS
          ═══════════════════════════════════════════════════════════ */}
      {activeSection === 'experts' && (
        <div className="animate-fade-in">
          {/* Expert Banner */}
          <div className="mb-6 rounded-xl p-5" style={{
            background: 'linear-gradient(135deg, rgba(0,240,255,0.06), rgba(139,92,246,0.04), rgba(255,0,170,0.03))',
            border: '1px solid rgba(0,240,255,0.1)',
          }}>
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={20} style={{ color: '#00f0ff' }} />
              <h2 className="text-lg font-bold" style={{ color: '#e2e8f0' }}>Ready-to-Use Expert Agents</h2>
            </div>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Click any expert below to instantly start chatting. No setup needed — just ask your question.
            </p>
          </div>

          {/* Expert Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {EXPERT_AGENTS.map((expert) => (
              <button
                key={expert.id}
                onClick={() => launchExpert(expert)}
                className="game-card p-5 text-left group relative overflow-hidden"
                style={{ cursor: 'pointer' }}
              >
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${expert.accent}, transparent)` }} />

                {/* Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${expert.glow}, rgba(255,255,255,0.03))`,
                      border: `1px solid ${expert.accent}30`,
                      boxShadow: `0 0 15px ${expert.glow}`,
                    }}>
                    <expert.icon size={22} style={{ color: expert.accent }} />
                  </div>
                  <span className="text-[9px] font-black tracking-[2px] px-2 py-1 rounded"
                    style={{ background: `${expert.glow}`, color: expert.accent, border: `1px solid ${expert.accent}30` }}>
                    {expert.tag}
                  </span>
                </div>

                <h3 className="text-[15px] font-bold mb-1.5 group-hover:text-white transition-colors" style={{ color: '#e2e8f0' }}>
                  {expert.name}
                </h3>
                <p className="text-[12px] leading-relaxed mb-4" style={{ color: '#64748b' }}>
                  {expert.description}
                </p>

                {/* Suggestions preview */}
                <div className="flex flex-wrap gap-1.5">
                  {expert.suggestions.slice(0, 2).map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-md truncate max-w-[180px]"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Hover CTA */}
                <div className="mt-4 flex items-center gap-2 text-[12px] font-bold transition-all"
                  style={{ color: expert.accent }}>
                  <MessageSquare size={14} />
                  Start Chatting
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: CUSTOM STUDIO
          ═══════════════════════════════════════════════════════════ */}
      {activeSection === 'studio' && (
        <div className="animate-fade-in">
          {/* Smart Builder Banner */}
          <div className="mb-6 relative overflow-hidden" style={{
            borderRadius: '16px', padding: '2px',
            background: 'linear-gradient(135deg, #8b5cf6, #00f0ff, #ff00aa, #8b5cf6)',
            backgroundSize: '300% 300%', animation: 'border-flow 4s ease infinite',
          }}>
            <div className="relative rounded-[14px] p-6" style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,240,255,0.08), rgba(18,18,26,0.95))',
            }}>
              <div className="absolute inset-0 rounded-[14px] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }} />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl animate-float" style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,240,255,0.2))',
                    border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 20px rgba(139,92,246,0.2)',
                  }}>
                    <Wand2 size={24} style={{ color: '#00f0ff' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold neon-text">Smart Agent Builder</h2>
                    <p className="text-sm" style={{ color: '#64748b' }}>Describe what you need in plain English — AI builds the agent for you.</p>
                  </div>
                </div>
                <button onClick={() => router.push('/agent-builder')} className="game-btn flex items-center gap-2 shrink-0">
                  <Wand2 size={16} /> Build an Agent
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Wand2, title: 'AI Builder', sub: 'Describe & create', href: '/agent-builder', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
              { icon: Bot, title: 'Manual Create', sub: 'Full configuration', href: '/agents', accent: '#00ff88', glow: 'rgba(0,255,136,0.15)' },
              { icon: Star, title: 'Skill Tree', sub: `${totalSkills} skills available`, href: '/skills', accent: '#00f0ff', glow: 'rgba(0,240,255,0.15)' },
              { icon: Key, title: 'Credentials', sub: `${(creds as any[]).length} configured`, href: '/credentials', accent: '#ff00aa', glow: 'rgba(255,0,170,0.15)' },
            ].map(a => (
              <button key={a.title} onClick={() => router.push(a.href)}
                className="rounded-xl p-4 text-left transition-all group"
                style={{ background: `linear-gradient(135deg, ${a.glow}, transparent)`, border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${a.accent}40`
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${a.glow}`
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}>
                <a.icon size={22} className="mb-2" style={{ color: a.accent, filter: `drop-shadow(0 0 6px ${a.accent}60)` }} />
                <div className="text-[13px] font-bold" style={{ color: '#e2e8f0' }}>{a.title}</div>
                <div className="mt-0.5 text-[11px]" style={{ color: '#64748b' }}>{a.sub}</div>
              </button>
            ))}
          </div>

          {/* My Custom Agents */}
          <div className="game-card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                <span style={{ color: '#8b5cf6', marginRight: '6px' }}>//</span>
                My Custom Agents
                <span className="ml-2 text-[11px] font-normal" style={{ color: '#64748b' }}>({(agents as any[]).length} total)</span>
              </h2>
              <button onClick={() => router.push('/agents')} className="game-btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }}>
                Manage All
              </button>
            </div>

            {(agents as any[]).length === 0 ? (
              <div className="py-10 text-center">
                <Bot size={36} className="mx-auto mb-3" style={{ color: '#475569' }} />
                <p className="text-sm font-medium mb-1" style={{ color: '#64748b' }}>No custom agents yet</p>
                <p className="text-xs mb-4" style={{ color: '#475569' }}>Use the AI Builder above or create one manually</p>
                <button onClick={() => router.push('/agent-builder')} className="game-btn text-xs" style={{ padding: '8px 20px' }}>
                  <Wand2 size={14} className="inline mr-1" /> Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(agents as any[]).slice(0, 6).map((agent: any) => (
                  <div key={agent.id}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={() => router.push('/agents')}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.04)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Bot size={16} style={{ color: '#8b5cf6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate" style={{ color: '#e2e8f0' }}>{agent.name}</div>
                        <div className="text-[11px] truncate" style={{ color: '#64748b' }}>{agent.model_name}</div>
                      </div>
                      <div className="h-2 w-2 rounded-full" style={{
                        background: agent.is_active ? '#00ff88' : '#ff4d6a',
                        boxShadow: agent.is_active ? '0 0 6px rgba(0,255,136,0.5)' : 'none',
                      }} />
                    </div>
                  </div>
                ))}
                {(agents as any[]).length > 6 && (
                  <button onClick={() => router.push('/agents')}
                    className="rounded-xl p-4 flex items-center justify-center gap-2 text-[12px] font-bold transition-all"
                    style={{ border: '1px dashed rgba(139,92,246,0.2)', color: '#8b5cf6' }}>
                    <Plus size={14} /> View all {(agents as any[]).length} agents
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Skills', value: totalSkills, sub: `${(catalog as any[]).length} categories`, color: '#00ff88', icon: Star, href: '/skills' },
              { label: 'Active Agents', value: activeAgents, sub: `${(agents as any[]).length} total`, color: '#00f0ff', icon: Bot, href: '/agents' },
              { label: 'Credentials', value: (creds as any[]).length, sub: 'configured', color: '#8b5cf6', icon: Key, href: '/credentials' },
              { label: 'Success Rate', value: stats ? `${stats.success_rate}%` : '--', sub: `${stats?.total_runs ?? 0} runs`, color: '#ff00aa', icon: Activity, href: '/monitoring' },
            ].map(s => (
              <button key={s.label} onClick={() => router.push(s.href)} className="hud-stat text-left transition-all hover:scale-[1.02] group" style={{ cursor: 'pointer' }}>
                <div className="mb-2 flex items-center justify-between">
                  <s.icon size={16} style={{ color: s.color, filter: `drop-shadow(0 0 4px ${s.color}60)` }} />
                  <ChevronRight size={12} style={{ color: '#475569' }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: s.color, textShadow: `0 0 15px ${s.color}30` }}>{s.value as any}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CHAT MODAL
          ═══════════════════════════════════════════════════════════ */}
      {chatOpen && activeExpert && (
        <div className="game-modal-overlay" onClick={closeChat}>
          <div className="game-modal w-full max-w-2xl mx-4 flex flex-col" onClick={e => e.stopPropagation()}
            style={{ height: '80vh', maxHeight: '700px' }}>

            {/* Header */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: activeExpert.glow, border: `1px solid ${activeExpert.accent}30` }}>
                <activeExpert.icon size={20} style={{ color: activeExpert.accent }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{activeExpert.name}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#00ff88', boxShadow: '0 0 4px #00ff88' }} />
                  <span className="text-[10px]" style={{ color: '#64748b' }}>
                    {creating ? 'Initializing...' : 'Online'}
                  </span>
                </div>
              </div>
              <button onClick={closeChat} className="rounded-lg p-2 transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ff4d6a'; e.currentTarget.style.background = 'rgba(255,0,85,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: '#0a0a0f' }}>
              {creating && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: activeExpert.accent }} />
                  <span className="text-sm" style={{ color: '#64748b' }}>Setting up {activeExpert.name}...</span>
                </div>
              )}

              {!creating && chatMsgs.length === 0 && (
                <div className="py-6">
                  <div className="text-center mb-6">
                    <activeExpert.icon size={32} className="mx-auto mb-3" style={{ color: activeExpert.accent, filter: `drop-shadow(0 0 8px ${activeExpert.accent}60)` }} />
                    <h3 className="text-sm font-bold mb-1" style={{ color: '#e2e8f0' }}>Chat with {activeExpert.name}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>Ask any question or try a suggestion below</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {activeExpert.suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="text-left rounded-lg px-4 py-3 text-[13px] transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${activeExpert.accent}30`
                          ;(e.currentTarget as HTMLElement).style.background = `${activeExpert.glow}`
                          ;(e.currentTarget as HTMLElement).style.color = '#e2e8f0'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                          ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                          ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
                        }}>
                        <MessageSquare size={12} className="inline mr-2" style={{ color: activeExpert.accent }} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMsgs.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] rounded-xl px-4 py-3 text-[13px] leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))', color: '#e2e8f0', border: '1px solid rgba(0,240,255,0.15)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.06)' }
                    }>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: activeExpert.accent }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-2">
                <input
                  className="game-input flex-1"
                  placeholder={creating ? 'Initializing...' : `Ask ${activeExpert.name}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={creating || chatLoading}
                  style={{ fontSize: '13px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || creating || chatLoading}
                  className="game-btn flex items-center gap-1.5"
                  style={{ padding: '8px 16px', opacity: (!chatInput.trim() || creating || chatLoading) ? 0.4 : 1 }}>
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
