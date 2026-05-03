'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  Sparkles, Zap, Bot, Brain, Code2, Shield, Rocket, ArrowRight,
  Scale, Stethoscope, DollarSign, Dumbbell, Briefcase, Pen,
  MessageSquare, Cpu, Globe, Layers, ChevronRight, Star
} from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'Multi-Model AI',
    description: 'Switch between Claude, GPT-4, Gemini, Llama, and Ollama — all in one place.',
    accent: '#00f0ff',
    glow: 'rgba(0,240,255,0.15)',
  },
  {
    icon: Bot,
    title: 'Expert Agents',
    description: 'Pre-built specialists for legal, medical, finance, fitness, coding, and more.',
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: Sparkles,
    title: 'Custom Agents',
    description: 'Write your own system prompt and launch a personalised AI agent in seconds.',
    accent: '#ff00aa',
    glow: 'rgba(255,0,170,0.15)',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data stays yours. End-to-end encrypted auth with secure API key storage.',
    accent: '#00ff88',
    glow: 'rgba(0,255,136,0.15)',
  },
  {
    icon: Rocket,
    title: 'Deploy Agents',
    description: 'Deploy your agents as APIs or embed them in your own apps and workflows.',
    accent: '#ff6b35',
    glow: 'rgba(255,107,53,0.15)',
  },
  {
    icon: Layers,
    title: 'Skill System',
    description: 'Equip agents with skills — web search, code execution, document analysis, and more.',
    accent: '#fbbf24',
    glow: 'rgba(251,191,36,0.15)',
  },
]

const AGENTS_PREVIEW = [
  { icon: Scale, name: 'Legal Adviser', tag: 'INDIA', accent: '#ff6b35' },
  { icon: Stethoscope, name: 'Medical Guide', tag: 'HEALTH', accent: '#00ff88' },
  { icon: DollarSign, name: 'Financial Adviser', tag: 'FINANCE', accent: '#fbbf24' },
  { icon: Brain, name: 'Wellness Coach', tag: 'MENTAL', accent: '#8b5cf6' },
  { icon: Dumbbell, name: 'Fitness Coach', tag: 'FITNESS', accent: '#ff00aa' },
  { icon: Code2, name: 'Dev Assistant', tag: 'CODE', accent: '#00f0ff' },
  { icon: Briefcase, name: 'Startup Mentor', tag: 'BIZ', accent: '#ff6b35' },
  { icon: Pen, name: 'Writing Coach', tag: 'CREATIVE', accent: '#a78bfa' },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated()) {
    router.replace('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: '#13141d' }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,240,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 0%, rgba(0,240,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.06) 0%, transparent 50%)',
      }} />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-4" style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(19,20,29,0.8)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', boxShadow: '0 0 20px rgba(0,240,255,0.3)' }}>
            <Zap size={18} className="text-black" />
          </div>
          <span className="text-lg font-black tracking-tight" style={{ color: '#00f0ff' }}>AI STUDIO</span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-black"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>v5</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300"
            style={{ color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)', background: 'rgba(0,240,255,0.05)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.12)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,240,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.05)'; e.currentTarget.style.boxShadow = 'none' }}>
            Login
          </Link>
          <Link href="/signup"
            className="game-btn px-5 py-2 rounded-lg text-sm font-bold">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 animate-fade-in"
          style={{ background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)' }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88', animation: 'pulse-glow 2s ease-in-out infinite' }} />
          <span className="text-xs font-bold" style={{ color: '#8b92a8' }}>MULTI-MODEL PLATFORM <span style={{ color: '#00f0ff' }}>ONLINE</span></span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight animate-fade-in" style={{ maxWidth: '900px' }}>
          <span style={{ color: '#eef0f6' }}>Your AI </span>
          <span className="neon-text">Command Center</span>
        </h1>

        <p className="text-base md:text-lg mb-10 animate-fade-in" style={{ color: '#8b92a8', maxWidth: '600px', lineHeight: 1.7 }}>
          Build, deploy, and manage AI agents powered by Claude, GPT-4, Gemini, and more.
          Pre-built experts for law, medicine, finance — or create your own in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
          <Link href="/signup"
            className="game-btn flex items-center gap-2 text-base px-8 py-3.5">
            Get Started Free <ArrowRight size={18} />
          </Link>
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold transition-all duration-300"
            style={{ color: '#8b92a8', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#eef0f6'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b92a8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
            Try Without Account <ChevronRight size={16} />
          </button>
        </div>

        {/* Glowing orb decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(0,240,255,0.04) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </section>

      {/* ── Features Grid ──────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: '#eef0f6' }}>
            Everything You Need to <span className="neon-text">Build with AI</span>
          </h2>
          <p className="text-sm" style={{ color: '#8b92a8' }}>Powerful features, zero complexity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl p-6 transition-all duration-300 group"
              style={{
                background: '#1c1d2b',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${f.accent}33`
                e.currentTarget.style.boxShadow = `0 0 30px ${f.glow}`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              <div className="flex items-center justify-center h-10 w-10 rounded-lg mb-4"
                style={{ background: f.glow, border: `1px solid ${f.accent}33` }}>
                <f.icon size={20} style={{ color: f.accent }} />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: '#eef0f6' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#8b92a8' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Expert Agents Preview ──────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: '#eef0f6' }}>
            Pre-Built <span className="neon-text">Expert Agents</span>
          </h2>
          <p className="text-sm" style={{ color: '#8b92a8' }}>Ready-to-use specialists — just pick one and start chatting</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AGENTS_PREVIEW.map((a) => (
            <div key={a.name} className="rounded-xl p-4 text-center transition-all duration-300"
              style={{
                background: '#1c1d2b',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${a.accent}33`
                e.currentTarget.style.boxShadow = `0 0 20px ${a.accent}15`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-3"
                style={{ background: `${a.accent}15`, border: `1px solid ${a.accent}33` }}>
                <a.icon size={20} style={{ color: a.accent }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: '#eef0f6' }}>{a.name}</p>
              <span className="text-[9px] font-black px-2 py-0.5 rounded"
                style={{ background: `${a.accent}15`, color: a.accent }}>{a.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Models Section ─────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 md:p-12 text-center" style={{
          background: 'linear-gradient(135deg, rgba(0,240,255,0.05), rgba(139,92,246,0.05))',
          border: '1px solid rgba(0,240,255,0.1)',
        }}>
          <Cpu size={32} className="mx-auto mb-4" style={{ color: '#00f0ff' }} />
          <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: '#eef0f6' }}>
            One Platform, <span className="neon-text">Every Model</span>
          </h2>
          <p className="text-sm mb-8" style={{ color: '#8b92a8', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Switch between the world's best AI models with a single click. No vendor lock-in.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Claude', 'GPT-4', 'Gemini', 'Llama', 'Ollama'].map((model) => (
              <div key={model} className="flex items-center gap-2 rounded-lg px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Globe size={14} style={{ color: '#00f0ff' }} />
                <span className="text-sm font-bold" style={{ color: '#eef0f6' }}>{model}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: '#eef0f6' }}>
          Ready to <span className="neon-text">Level Up</span>?
        </h2>
        <p className="text-sm mb-8" style={{ color: '#8b92a8' }}>
          Create your free account and start building with AI in minutes.
        </p>
        <Link href="/signup"
          className="game-btn inline-flex items-center gap-2 text-base px-10 py-4">
          Start Building <Rocket size={18} />
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 md:px-12 py-8 text-center" style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap size={14} style={{ color: '#00f0ff' }} />
          <span className="text-sm font-bold" style={{ color: '#8b92a8' }}>AI Studio</span>
        </div>
        <p className="text-xs" style={{ color: '#6b7394' }}>
          Built with Next.js, Cloudflare, and the world's best AI models.
        </p>
      </footer>
    </div>
  )
}
