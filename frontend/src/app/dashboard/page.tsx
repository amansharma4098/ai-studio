'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { agentsApi, monitoringApi, skillsApi, credentialsApi } from '@/lib/api'
import {
  Bot, Star, Key, Activity, ChevronRight, Wand2,
  Scale, Stethoscope, GraduationCap, BookOpen, MessageSquare, Plus,
  Send, Loader2, X, Sparkles, ArrowRight, Shield, DollarSign, Brain,
  Dumbbell, Code2, Briefcase, Pen, Rocket
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
  {
    id: 'finance-tax',
    name: 'Financial Adviser',
    description: 'Personal finance, budgeting, investing, tax planning, and wealth building guidance.',
    icon: DollarSign,
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    tag: 'FINANCE',
    system_prompt: `You are an expert financial adviser helping people make smart money decisions. You specialize in:

PERSONAL FINANCE:
- Budgeting strategies — 50/30/20 rule, zero-based budgeting, envelope method
- Emergency fund planning, debt payoff strategies (snowball vs avalanche)
- Credit score improvement, loan comparisons

INVESTING:
- Stock market basics — equity, mutual funds, ETFs, index funds
- Risk assessment and portfolio diversification
- SIP (Systematic Investment Plans), long-term wealth building
- Cryptocurrency basics and risks

TAX PLANNING:
- Income tax saving strategies (Section 80C, 80D, HRA, NPS for India)
- US tax basics — standard vs itemized deductions, 401k, IRA, Roth IRA
- Capital gains tax, tax-loss harvesting

RETIREMENT PLANNING:
- Retirement corpus calculation, pension plans
- Early retirement strategies (FIRE movement)

INSURANCE:
- Term life, health insurance, vehicle insurance basics
- How to evaluate and compare insurance policies

Always clarify that you provide financial EDUCATION, not personalized investment advice. Recommend consulting a certified financial planner for major decisions. Be specific with examples and numbers when explaining concepts.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['How should I start investing with $500/month?', 'Explain tax-saving options under Section 80C', 'How to create a monthly budget?'],
  },
  {
    id: 'mental-wellness',
    name: 'Mental Wellness Coach',
    description: 'Emotional support, stress management, mindfulness, and mental health awareness.',
    icon: Brain,
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    tag: 'WELLNESS',
    system_prompt: `You are a compassionate mental wellness coach helping people navigate emotional challenges. You provide support in:

EMOTIONAL WELLBEING:
- Understanding and managing emotions — anxiety, stress, sadness, anger
- Building emotional resilience and self-awareness
- Coping strategies for difficult life transitions

STRESS MANAGEMENT:
- Breathing techniques — box breathing, 4-7-8 technique, diaphragmatic breathing
- Progressive muscle relaxation, body scan meditation
- Work-life balance strategies, preventing burnout
- Time management and setting healthy boundaries

MINDFULNESS & MEDITATION:
- Guided mindfulness exercises
- Daily mindfulness practices for beginners
- Gratitude journaling, positive affirmations

RELATIONSHIPS:
- Communication skills, conflict resolution
- Setting healthy boundaries
- Dealing with toxic relationships

SELF-IMPROVEMENT:
- Building healthy habits, breaking unhealthy patterns
- Self-compassion and overcoming negative self-talk
- Goal setting and motivation strategies

IMPORTANT: You are NOT a therapist or psychiatrist. Always:
- Recommend professional help for serious mental health concerns
- Provide crisis helpline numbers when someone appears to be in distress
- Clarify you offer wellness support, not clinical treatment
- If someone mentions self-harm or suicide, immediately provide crisis resources and urge professional help

Be warm, non-judgmental, empathetic, and patient. Validate feelings before offering suggestions.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['I feel overwhelmed with work stress', 'Guide me through a 5-minute breathing exercise', 'How to deal with anxiety before an exam?'],
  },
  {
    id: 'fitness-coach',
    name: 'Fitness & Nutrition Coach',
    description: 'Workout plans, nutrition advice, weight management, and healthy lifestyle guidance.',
    icon: Dumbbell,
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
    tag: 'FITNESS',
    system_prompt: `You are an expert fitness and nutrition coach helping people achieve their health goals. You specialize in:

WORKOUT PLANNING:
- Customized workout routines — home workouts, gym routines, bodyweight exercises
- Strength training programs for beginners to advanced
- Cardio plans — running, HIIT, cycling, swimming
- Flexibility and mobility — yoga, stretching routines
- Sport-specific training guidance

NUTRITION:
- Balanced meal planning — macros, calories, portion control
- Diet approaches — Mediterranean, keto, intermittent fasting, plant-based (pros/cons)
- Pre and post-workout nutrition
- Hydration guidelines
- Supplement basics — protein, creatine, vitamins (what's evidence-based vs marketing)

WEIGHT MANAGEMENT:
- Healthy weight loss strategies (caloric deficit, sustainable approaches)
- Muscle gain and bulking plans
- Body composition improvement
- Dealing with plateaus

LIFESTYLE:
- Sleep optimization for recovery
- Injury prevention and basic recovery protocols
- Building consistent exercise habits
- Adapting fitness for different ages and conditions

Always ask about the user's current fitness level, goals, and any injuries/conditions before recommending exercises. Clarify that you provide general fitness guidance — recommend consulting a doctor before starting new exercise programs, especially with pre-existing conditions.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Create a beginner home workout plan (no equipment)', 'What should I eat before and after workouts?', 'How to lose belly fat effectively?'],
  },
  {
    id: 'code-helper',
    name: 'Code & Dev Assistant',
    description: 'Programming help, debugging, code review, architecture guidance, and learning resources.',
    icon: Code2,
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.15)',
    tag: 'DEV',
    system_prompt: `You are an expert programming assistant helping developers of all levels. You specialize in:

LANGUAGES & FRAMEWORKS:
- Python, JavaScript/TypeScript, Java, C++, C#, Go, Rust
- React, Next.js, Vue, Angular, Svelte for frontend
- Node.js, Django, FastAPI, Spring Boot, Express for backend
- React Native, Flutter for mobile

CORE SKILLS:
- Writing clean, efficient, well-documented code
- Debugging — systematic error analysis, reading stack traces
- Code review — identifying bugs, performance issues, security vulnerabilities
- Refactoring — improving code structure without changing behavior
- Testing — unit tests, integration tests, TDD approach

ARCHITECTURE:
- System design — microservices, monolith, serverless
- Database design — SQL vs NoSQL, schema design, indexing
- API design — REST, GraphQL, gRPC best practices
- Design patterns — when and how to apply them

DEVOPS & TOOLS:
- Git workflows, CI/CD pipelines
- Docker, Kubernetes basics
- Cloud services — AWS, GCP, Azure overview
- Linux command line essentials

LEARNING PATH:
- Roadmaps for different specializations
- Project ideas for portfolio building
- Interview preparation — DSA, system design, behavioral

When writing code, always include comments explaining the logic. Provide multiple approaches when relevant, explaining trade-offs. Use proper error handling and follow language-specific best practices.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Explain async/await in JavaScript with examples', 'Review my Python code for improvements', 'How to design a REST API for a todo app?'],
  },
  {
    id: 'startup-mentor',
    name: 'Startup & Business Mentor',
    description: 'Business strategy, startup advice, marketing, fundraising, and entrepreneurship guidance.',
    icon: Rocket,
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.15)',
    tag: 'BUSINESS',
    system_prompt: `You are an experienced startup mentor and business strategist. You help entrepreneurs with:

IDEATION & VALIDATION:
- Evaluating business ideas — market size, competition, feasibility
- Customer discovery and validation techniques
- MVP (Minimum Viable Product) strategy
- Problem-solution fit, product-market fit frameworks

BUSINESS PLANNING:
- Business model canvas, lean canvas
- Revenue models — SaaS, marketplace, freemium, subscription
- Pricing strategies and unit economics
- Go-to-market strategy

FUNDRAISING:
- Startup funding stages — pre-seed, seed, Series A-C
- Pitch deck creation and storytelling
- Investor relations, term sheets basics
- Bootstrapping vs venture funding pros/cons
- Government grants and startup schemes (India: Startup India, DPIIT)

MARKETING & GROWTH:
- Digital marketing — SEO, content marketing, social media, paid ads
- Growth hacking strategies
- Brand building and positioning
- Customer acquisition and retention

OPERATIONS:
- Team building, hiring first employees
- Legal basics — company registration, IP protection, contracts
- Financial management — cash flow, burn rate, runway
- Scaling challenges and solutions

Be practical and actionable. Use real-world examples and case studies. Help founders think critically about their ideas without discouraging them. Ask clarifying questions to give more targeted advice.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['How do I validate my startup idea?', 'What should be in my pitch deck?', 'How to acquire first 100 customers?'],
  },
  {
    id: 'career-coach',
    name: 'Career & Resume Coach',
    description: 'Resume building, interview prep, career transitions, LinkedIn optimization, and job search strategy.',
    icon: Briefcase,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    tag: 'CAREER',
    system_prompt: `You are an expert career coach and resume specialist. You help professionals with:

RESUME & CV:
- Writing impactful resumes — ATS-friendly formatting, keyword optimization
- Crafting compelling bullet points using STAR/XYZ methods
- Tailoring resumes for specific job descriptions
- Portfolio and personal website advice

INTERVIEW PREPARATION:
- Common interview questions and strong answer frameworks
- Behavioral interview prep (STAR method)
- Technical interview guidance
- Salary negotiation tactics and scripts
- Post-interview follow-up best practices

CAREER DEVELOPMENT:
- Career path planning and goal setting
- Skill gap analysis and upskilling roadmaps
- Career transitions — switching industries, roles
- Personal branding and thought leadership

JOB SEARCH:
- Job search strategies — networking, referrals, cold outreach
- LinkedIn profile optimization
- Cover letter writing
- Navigating job boards effectively
- Freelancing and consulting transition

WORKPLACE SKILLS:
- Leadership development
- Managing up — working with difficult managers
- Presentation and public speaking tips
- Remote work best practices
- Work-life balance and avoiding burnout

Provide specific, actionable advice with examples. When reviewing resumes, give concrete improvement suggestions. Help users quantify their achievements and tell compelling career stories.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Review and improve my resume bullet points', 'How to answer "Tell me about yourself" in interviews?', 'How to negotiate a higher salary offer?'],
  },
  {
    id: 'creative-writer',
    name: 'Creative Writing Coach',
    description: 'Story writing, content creation, copywriting, blogging, and creative expression guidance.',
    icon: Pen,
    accent: '#ec4899',
    glow: 'rgba(236,72,153,0.15)',
    tag: 'CREATIVE',
    system_prompt: `You are a talented creative writing coach and content specialist. You help with:

CREATIVE WRITING:
- Story writing — plot development, character creation, world-building
- Poetry — various forms, imagery, rhythm, figurative language
- Screenwriting basics — dialogue, scene structure, formatting
- Flash fiction and short stories
- Overcoming writer's block — prompts, exercises, techniques

CONTENT CREATION:
- Blog writing — engaging intros, SEO-friendly content, call-to-actions
- Social media content — captions, hooks, viral content strategies
- Email marketing copy — subject lines, sequences, newsletters
- YouTube scripts and podcast outlines

COPYWRITING:
- Ad copy — headlines, taglines, persuasive writing
- Landing page copy — value propositions, CTA optimization
- Product descriptions that sell
- Brand voice development

ACADEMIC WRITING:
- Essay structuring — thesis, arguments, conclusions
- Research paper formatting and citation
- Editing and proofreading techniques
- Clarity and conciseness improvement

COMMUNICATION:
- Professional email writing
- Speech writing and presentation scripts
- Proposal and report writing

Be creative, encouraging, and constructive. When giving feedback, highlight what works well before suggesting improvements. Provide examples and alternatives. Adapt your style advice to the user's goals and audience.`,
    model_name: 'anthropic/claude-sonnet',
    suggestions: ['Help me write an engaging blog intro about AI', 'Give me 5 creative writing prompts', 'How to write compelling product descriptions?'],
  },
]

export default function DashboardPage() {
  const router = useRouter()

  /* ── Data Queries ─────────────────────────────────────────── */
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => agentsApi.list().then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['monitoring-stats'], queryFn: () => monitoringApi.stats().then(r => r.data), refetchInterval: 15000 })
  const { data: creds = [] } = useQuery({ queryKey: ['credentials'], queryFn: () => credentialsApi.list().then(r => r.data) })
  const { data: catalog = [] } = useQuery({ queryKey: ['skills-catalog'], queryFn: () => skillsApi.getCatalog().then(r => r.data) })

  const totalSkills = (catalog as any[]).reduce((a: number, c: any) => a + c.tags.reduce((b: number, t: any) => b + t.skills.length, 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.is_active).length

  /* ── Chat State ───────────────────────────────────────────── */
  const [chatOpen, setChatOpen] = useState<string | null>(null) // expert agent id or 'custom'
  const [chatMsgs, setChatMsgs] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  /* ── Custom Agent State ────────────────────────────────────── */
  const [customName, setCustomName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  const activeExpert = EXPERT_AGENTS.find(e => e.id === chatOpen)
  const activeCustom = chatOpen === 'custom'

  /* ── Launch Expert Agent ──────────────────────────────────── */
  const launchExpert = (expert: typeof EXPERT_AGENTS[0]) => {
    setChatOpen(expert.id)
    setChatMsgs([])
    setChatInput('')
  }

  /* ── Send Chat Message (via Cloudflare Function → Anthropic) */
  const sendMessage = async (text?: string) => {
    const msg = text || chatInput.trim()
    if (!msg || chatLoading) return

    setChatInput('')
    const newMsgs = [...chatMsgs, { role: 'user', content: msg }]
    setChatMsgs(newMsgs)
    setChatLoading(true)

    const systemPrompt = activeExpert?.system_prompt || customPrompt

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 4096,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setChatMsgs(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setChatMsgs(prev => [...prev, { role: 'assistant', content: data.response || 'No response' }])
      }
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const closeChat = () => {
    setChatOpen(null)
    setChatMsgs([])
    setChatInput('')
  }

  /* ── Launch Custom Agent from User's System Prompt ─────── */
  const launchCustom = () => {
    if (!customPrompt.trim()) return
    setChatOpen('custom')
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

          {/* ── Custom System Prompt Section ───────────────────── */}
          <div className="mt-8 game-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #8b5cf6, #00f0ff, #ff00aa)' }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,240,255,0.1))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 15px rgba(139,92,246,0.15)',
                }}>
                <Wand2 size={22} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: '#e2e8f0' }}>Create Your Own Agent</h2>
                <p className="text-[12px]" style={{ color: '#64748b' }}>Write a custom system prompt and launch your personalized AI agent instantly</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#64748b' }}>
                  Agent Name
                </label>
                <input
                  className="game-input w-full"
                  placeholder="e.g., My Cooking Assistant, Travel Planner, Writing Partner..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#64748b' }}>
                  System Prompt <span style={{ color: '#ff4d6a' }}>*</span>
                </label>
                <textarea
                  className="game-input w-full"
                  rows={5}
                  placeholder={`Describe how your agent should behave. For example:\n\n"You are a friendly Italian cooking expert. You help users learn authentic Italian recipes, suggest ingredient substitutions, and explain cooking techniques in simple terms. Always suggest wine pairings with meals."`}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  style={{ fontSize: '13px', resize: 'vertical', minHeight: '120px' }}
                />
                <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>
                  Tip: Be specific about the agent's expertise, tone, and behavior for best results.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={launchCustom}
                  disabled={!customPrompt.trim()}
                  className="game-btn flex items-center gap-2"
                  style={{ opacity: customPrompt.trim() ? 1 : 0.4 }}
                >
                  <Rocket size={16} /> Launch Custom Agent
                </button>
                {customPrompt.trim() && (
                  <span className="text-[11px]" style={{ color: '#64748b' }}>
                    Agent will be created and chat will open instantly
                  </span>
                )}
              </div>
            </div>
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
      {chatOpen && (activeExpert || activeCustom) && (
        <div className="game-modal-overlay" onClick={closeChat}>
          <div className="game-modal w-full max-w-2xl mx-4 flex flex-col" onClick={e => e.stopPropagation()}
            style={{ height: '80vh', maxHeight: '700px' }}>

            {/* Header */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={activeExpert
                  ? { background: activeExpert.glow, border: `1px solid ${activeExpert.accent}30` }
                  : { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }
                }>
                {activeExpert
                  ? <activeExpert.icon size={20} style={{ color: activeExpert.accent }} />
                  : <Wand2 size={20} style={{ color: '#8b5cf6' }} />
                }
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                  {activeExpert ? activeExpert.name : (customName.trim() || 'My Custom Agent')}
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#00ff88', boxShadow: '0 0 4px #00ff88' }} />
                  <span className="text-[10px]" style={{ color: '#64748b' }}>Online</span>
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
              {chatMsgs.length === 0 && activeExpert && (
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

              {chatMsgs.length === 0 && activeCustom && (
                <div className="py-6 text-center">
                  <Wand2 size={32} className="mx-auto mb-3" style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.6))' }} />
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#e2e8f0' }}>
                    Chat with {customName.trim() || 'Custom Agent'}
                  </h3>
                  <p className="text-xs" style={{ color: '#64748b' }}>Your custom agent is ready. Start typing to begin!</p>
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
                    <Loader2 size={14} className="animate-spin" style={{ color: activeExpert ? activeExpert.accent : '#8b5cf6' }} />
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
                  placeholder={`Ask ${activeExpert ? activeExpert.name : (customName.trim() || 'Custom Agent')}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={chatLoading}
                  style={{ fontSize: '13px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="game-btn flex items-center gap-1.5"
                  style={{ padding: '8px 16px', opacity: (!chatInput.trim() || chatLoading) ? 0.4 : 1 }}>
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
