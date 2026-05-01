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
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto" style={{ background: '#12121a', minHeight: '100vh' }}>

      {/* ── Header: Forge Title ──────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl animate-float"
            style={{
              background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(0,240,255,0.25)',
              boxShadow: '0 0 20px rgba(0,240,255,0.15), 0 0 40px rgba(139,92,246,0.08)',
            }}
          >
            <Wand2 size={22} style={{ color: '#00f0ff' }} />
          </div>
          <div>
            <h1 className="neon-text text-2xl font-black tracking-tight" style={{ letterSpacing: '0.5px' }}>
              AGENT FORGE
            </h1>
            <p style={{ color: '#64748b', fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>
              Describe your vision &mdash; the forge brings it to life
            </p>
          </div>
        </div>
        {/* Decorative line */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,240,255,0.3), rgba(139,92,246,0.2), transparent)', marginTop: '16px' }} />
      </div>

      {/* ── Description Input: Glowing Forge Zone ────────────── */}
      <div
        className="mb-10"
        style={{
          borderRadius: '16px',
          border: '2px dashed rgba(0,240,255,0.25)',
          background: 'linear-gradient(135deg, rgba(0,240,255,0.03), rgba(139,92,246,0.04), rgba(0,255,136,0.02))',
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '50px', height: '3px', background: 'linear-gradient(90deg, #00f0ff, transparent)', borderRadius: '0 0 4px 0' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '50px', background: 'linear-gradient(180deg, #00f0ff, transparent)', borderRadius: '0 0 0 4px' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '50px', height: '3px', background: 'linear-gradient(270deg, #8b5cf6, transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '3px', height: '50px', background: 'linear-gradient(0deg, #8b5cf6, transparent)' }} />

        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00f0ff', marginBottom: '12px' }}>
          &gt; FORGE INPUT &mdash; Describe your agent in plain English
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., I need an agent that monitors my Azure costs daily, identifies any spending anomalies, and sends a Slack alert if costs exceed the budget by more than 10%..."
          className="game-input"
          style={{
            resize: 'none',
            minHeight: '110px',
            fontSize: '14px',
            background: 'rgba(15,15,24,0.8)',
            borderColor: 'rgba(0,240,255,0.12)',
          }}
          rows={4}
        />

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || generateMutation.isPending}
            className="game-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              fontSize: '12px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {generateMutation.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={15} /> Preview Agent Config</>
            )}
          </button>
          <button
            onClick={handleCreateNow}
            disabled={!description.trim() || createMutation.isPending}
            className="game-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #00ff88, #00f0ff)',
              fontSize: '12px',
              letterSpacing: '0.8px',
            }}
          >
            {createMutation.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Creating...</>
            ) : (
              <><Zap size={15} /> Create Instantly</>
            )}
          </button>
        </div>

        {/* Quick suggestions: Ability Chips */}
        <div className="mt-5">
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b' }}>
            Quick Abilities:
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
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
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(139,92,246,0.25)',
                  background: 'rgba(139,92,246,0.06)',
                  padding: '5px 14px',
                  fontSize: '11px',
                  color: '#a78bfa',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.15)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.45)';
                  (e.target as HTMLElement).style.boxShadow = '0 0 15px rgba(139,92,246,0.12)';
                  (e.target as HTMLElement).style.color = '#c4b5fd';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.06)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
                  (e.target as HTMLElement).style.boxShadow = 'none';
                  (e.target as HTMLElement).style.color = '#a78bfa';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Generated Config Preview: Blueprint / Schematic ──── */}
      {generatedConfig && (
        <div
          className="game-card animate-fade-in mb-10"
          style={{
            padding: '28px',
            borderColor: 'rgba(0,255,136,0.15)',
            background: 'linear-gradient(135deg, rgba(0,255,136,0.03), #12121a 60%)',
            position: 'relative',
          }}
        >
          {/* Top neon accent bar */}
          <div style={{ position: 'absolute', top: 0, left: '24px', right: '24px', height: '2px', background: 'linear-gradient(90deg, transparent, #00ff88, #00f0ff, transparent)', borderRadius: '0 0 2px 2px' }} />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(0,255,136,0.08)',
                  border: '1px solid rgba(0,255,136,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} style={{ color: '#00ff88' }} />
              </div>
              <div>
                <h2 className="neon-text-green" style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Blueprint Generated
                </h2>
                <span style={{ fontSize: '10px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Agent Schematic Ready</span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="game-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '11px' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy Config'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00f0ff' }}>
                  // Designation
                </span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginTop: '4px' }}>
                  {generatedConfig.icon} {generatedConfig.name}
                </p>
              </div>
              {/* Description */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00f0ff' }}>
                  // Mission Brief
                </span>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.6' }}>
                  {generatedConfig.description}
                </p>
              </div>
              {/* Model */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00f0ff' }}>
                  // Core Module
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="badge-info">{generatedConfig.model_name}</span>
                  <span className="badge-purple">temp: {generatedConfig.temperature}</span>
                </div>
              </div>
              {/* Skills */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#00f0ff' }}>
                  // Equipped Skills
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {generatedConfig.suggested_skills?.map((s: string) => (
                    <span
                      key={s}
                      style={{
                        borderRadius: '6px',
                        background: 'rgba(0,255,136,0.08)',
                        border: '1px solid rgba(0,255,136,0.2)',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#00ff88',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#8b5cf6' }}>
                // System Directive
              </span>
              <pre
                style={{
                  marginTop: '8px',
                  borderRadius: '10px',
                  background: 'rgba(15,15,24,0.8)',
                  border: '1px solid rgba(139,92,246,0.12)',
                  padding: '16px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  lineHeight: '1.6',
                }}
              >
                {generatedConfig.system_prompt}
              </pre>
            </div>
          </div>

          {/* Create button */}
          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
            <button
              onClick={handleCreateNow}
              disabled={createMutation.isPending}
              className="game-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #00ff88, #00f0ff)',
                fontSize: '12px',
                letterSpacing: '1px',
              }}
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Deploy This Agent
            </button>
          </div>
        </div>
      )}

      {/* ── Templates: Achievement Cards ────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div style={{ width: '4px', height: '20px', borderRadius: '2px', background: 'linear-gradient(180deg, #8b5cf6, #00f0ff)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#e2e8f0' }}>
            Pre-forged Templates
          </h2>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(139,92,246,0.2), transparent)' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates as any[]).map((tpl: any) => {
            const Icon = TEMPLATE_ICONS[tpl.icon] || Bot
            return (
              <div
                key={tpl.id}
                className="game-card group"
                style={{
                  padding: '22px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => templateMutation.mutate(tpl.id)}
              >
                {/* Achievement-style top bar */}
                <div style={{ position: 'absolute', top: 0, left: '20px', width: '40px', height: '3px', background: 'linear-gradient(90deg, #8b5cf6, transparent)', borderRadius: '0 0 4px 4px', transition: 'width 0.3s' }} className="group-hover:!w-[80px]" />

                <div className="flex items-center gap-3 mb-3">
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                    }}
                    className="group-hover:!border-[rgba(0,240,255,0.35)] group-hover:!bg-[rgba(0,240,255,0.08)] group-hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                  >
                    <Icon size={20} style={{ color: '#8b5cf6', transition: 'color 0.3s' }} className="group-hover:!text-[#00f0ff]" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.3px' }}>
                      {tpl.name}
                    </h3>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      {tpl.category}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tpl.description}
                </p>

                {/* Tags as mini badges */}
                <div className="flex flex-wrap gap-1.5">
                  {tpl.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="badge-purple" style={{ fontSize: '10px', padding: '1px 8px' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover reveal action */}
                <div
                  className="flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ fontSize: '11px', fontWeight: 700, color: '#00f0ff', letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  Activate Template <ChevronRight size={13} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
