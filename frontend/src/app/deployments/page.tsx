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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

  return (
    <>
      {/* Inline styles for gaming aesthetic */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 800px; }
        }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.3), 0 0 10px rgba(0, 240, 255, 0.1); }
          50% { box-shadow: 0 0 12px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.2); }
        }
        @keyframes neonFlash {
          0% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.4); color: #00f0ff; }
          50% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.3); color: #fff; }
          100% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.4); color: #00f0ff; }
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 6px rgba(0, 240, 255, 0.6); }
          50% { text-shadow: 0 0 16px rgba(0, 240, 255, 0.9), 0 0 30px rgba(0, 240, 255, 0.4); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-expand {
          animation: expandDown 0.35s ease-out forwards;
          overflow: hidden;
        }
        .game-card {
          background: linear-gradient(135deg, rgba(18, 18, 26, 0.95) 0%, rgba(22, 22, 35, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          position: relative;
          transition: all 0.25s ease;
        }
        .game-card:hover {
          border-color: rgba(0, 240, 255, 0.15);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.05), inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .game-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.2), transparent);
        }
        .game-btn {
          background: linear-gradient(135deg, #00f0ff 0%, #00c4cc 100%);
          color: #0a0a12;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
          overflow: hidden;
        }
        .game-btn:hover {
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.15);
          transform: translateY(-1px);
        }
        .game-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .game-btn-secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-weight: 600;
          font-size: 11px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
        }
        .game-btn-secondary:hover {
          border-color: rgba(0, 240, 255, 0.3);
          color: #00f0ff;
          background: rgba(0, 240, 255, 0.05);
        }
        .game-btn-danger {
          background: transparent;
          color: rgba(255, 80, 80, 0.8);
          border: 1px solid rgba(255, 80, 80, 0.2);
          border-radius: 8px;
          font-weight: 600;
          font-size: 11px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
        }
        .game-btn-danger:hover {
          border-color: rgba(255, 80, 80, 0.5);
          color: #ff4444;
          background: rgba(255, 80, 80, 0.08);
          box-shadow: 0 0 12px rgba(255, 80, 80, 0.15);
        }
        .game-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          transition: all 0.2s ease;
          outline: none;
        }
        .game-input:focus {
          border-color: rgba(0, 240, 255, 0.4);
          box-shadow: 0 0 12px rgba(0, 240, 255, 0.1);
          background: rgba(0, 240, 255, 0.02);
        }
        .game-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        .game-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
        }
        .game-modal {
          width: 100%;
          max-width: 480px;
          background: linear-gradient(180deg, #16162a 0%, #1c1d2b 100%);
          border: 1px solid rgba(0, 240, 255, 0.15);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 0 40px rgba(0, 240, 255, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.25s ease-out;
        }
        .game-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00f0ff, #8b5cf6, transparent);
        }
        .badge-success {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
          animation: neonPulse 2s ease-in-out infinite;
        }
        .badge-info {
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .badge-paused {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .neon-text {
          color: #00f0ff;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.2);
        }
        .neon-text-purple {
          color: #8b5cf6;
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.2);
        }
        .neon-text-green {
          color: #00ff88;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.2);
        }
        .hud-stat {
          background: linear-gradient(135deg, rgba(18, 18, 26, 0.95) 0%, rgba(22, 22, 35, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .hud-stat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
        }
        .hud-stat:nth-child(1)::before { background: linear-gradient(90deg, transparent, #00ff88, transparent); }
        .hud-stat:nth-child(2)::before { background: linear-gradient(90deg, transparent, #00f0ff, transparent); }
        .hud-stat:nth-child(3)::before { background: linear-gradient(90deg, transparent, #8b5cf6, transparent); }
        .hud-stat::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          top: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.005) 2px,
            rgba(255,255,255,0.005) 4px
          );
          pointer-events: none;
        }
        .hud-stat:hover {
          border-color: rgba(0, 240, 255, 0.12);
          transform: translateY(-2px);
        }
        .terminal-block {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 10px 14px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          font-size: 11px;
          color: #00ff88;
          position: relative;
          overflow: hidden;
        }
        .terminal-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, #00ff88, transparent);
          opacity: 0.4;
        }
        .copy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .copy-btn:hover {
          border-color: rgba(0, 240, 255, 0.3);
          color: #00f0ff;
          background: rgba(0, 240, 255, 0.05);
        }
        .copy-btn.copied {
          animation: neonFlash 0.6s ease-out;
          border-color: rgba(0, 240, 255, 0.5);
          color: #00f0ff;
        }
        .agent-icon-box {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(0, 240, 255, 0.06);
          border: 1px solid rgba(0, 240, 255, 0.1);
          position: relative;
        }
        .agent-icon-box.deployed {
          background: rgba(0, 255, 136, 0.06);
          border-color: rgba(0, 255, 136, 0.15);
          box-shadow: 0 0 12px rgba(0, 255, 136, 0.08);
        }
        .grid-bg {
          background-image:
            linear-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
        }
      `}</style>

      <div className="grid-bg p-4 sm:p-6 lg:p-8 min-h-screen" style={{ background: '#1c1d2b' }}>
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Rocket size={18} className="neon-text" />
            </div>
            <div>
              <h1 className="neon-text" style={{
                fontSize: 24, fontWeight: 800, letterSpacing: '1px',
                textTransform: 'uppercase', animation: 'glowPulse 3s ease-in-out infinite'
              }}>
                Launch Pad
              </h1>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginLeft: 49, letterSpacing: '0.3px' }}>
            Deploy your agents as chat widgets, shareable links, and API endpoints
          </p>
        </div>

        {/* HUD Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="hud-stat">
            <div className="flex items-center gap-4">
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(0, 255, 136, 0.08)',
                border: '1px solid rgba(0, 255, 136, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Rocket size={20} style={{ color: '#00ff88' }} />
              </div>
              <div>
                <p className="neon-text-green" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                  {deployedAgentIds.size}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
                  Deployed
                </p>
              </div>
            </div>
          </div>

          <div className="hud-stat">
            <div className="flex items-center gap-4">
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <MessageSquare size={20} style={{ color: '#00f0ff' }} />
              </div>
              <div>
                <p className="neon-text" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                  {Object.values(allDeployments).flat().reduce((a: number, d: any) => a + (d.total_messages || 0), 0)}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
                  Messages
                </p>
              </div>
            </div>
          </div>

          <div className="hud-stat">
            <div className="flex items-center gap-4">
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Eye size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="neon-text-purple" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                  {Object.values(allDeployments).flat().reduce((a: number, d: any) => a + (d.total_conversations || 0), 0)}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
                  Conversations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Label */}
        <div className="flex items-center gap-3 mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.15), transparent)' }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Mission Roster
          </span>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.15))' }} />
        </div>

        {/* Agent List */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          {(agents as any[]).map((agent: any) => {
            const deps = allDeployments[agent.id] || []
            const isDeployed = deps.length > 0
            const dep = deps[0]
            const isExpanded = expandedAgent === agent.id

            return (
              <div key={agent.id} className="game-card" style={{ overflow: 'hidden' }}>
                {/* Agent header */}
                <div className="flex items-center gap-4" style={{ padding: '16px 20px' }}>
                  <div className={`agent-icon-box ${isDeployed ? 'deployed' : ''}`}>
                    <Bot size={18} style={{ color: isDeployed ? '#00ff88' : 'rgba(0, 240, 255, 0.5)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate" style={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>
                        {agent.name}
                      </h3>
                      {isDeployed ? (
                        dep.is_active ? (
                          <span className="badge-success">
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 6px #00ff88' }} />
                            Live
                          </span>
                        ) : (
                          <span className="badge-paused">Paused</span>
                        )
                      ) : (
                        <span className="badge-info">Standby</span>
                      )}
                    </div>
                    <p className="truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                      {agent.description || agent.model_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDeployed ? (
                      <>
                        <button
                          onClick={() => toggleMut.mutate({ id: dep.id, active: !dep.is_active })}
                          style={{
                            padding: 8, borderRadius: 8, background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                            transition: 'all 0.2s ease', display: 'flex'
                          }}
                          title={dep.is_active ? 'Pause' : 'Activate'}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,240,255,0.2)' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
                        >
                          {dep.is_active
                            ? <ToggleRight size={20} style={{ color: '#00ff88' }} />
                            : <ToggleLeft size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          }
                        </button>
                        <button
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                          style={{
                            padding: 8, borderRadius: 8, background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                            transition: 'all 0.2s ease', display: 'flex'
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,240,255,0.2)' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
                        >
                          {isExpanded
                            ? <ChevronDown size={16} style={{ color: '#00f0ff' }} />
                            : <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          }
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeployModal(agent.id)}
                        className="game-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Rocket size={13} /> Launch
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded deployment details */}
                {isExpanded && dep && (
                  <div className="animate-expand">
                    <div className="section-divider" />
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        {/* Share Link */}
                        <div style={{
                          background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.06)', padding: 16
                        }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Globe size={14} style={{ color: '#00f0ff' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              Share Link
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="terminal-block flex-1 truncate" style={{ fontSize: 11 }}>
                              /share/{dep.slug}
                            </div>
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/share/${dep.slug}`, 'link')}
                              className={`copy-btn ${copied === 'link' ? 'copied' : ''}`}
                            >
                              {copied === 'link' ? <Check size={13} style={{ color: '#00ff88' }} /> : <Copy size={13} />}
                            </button>
                            <a href={`/share/${dep.slug}`} target="_blank" className="copy-btn" style={{ textDecoration: 'none' }}>
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>

                        {/* Embed Widget */}
                        <div style={{
                          background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.06)', padding: 16
                        }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Code size={14} style={{ color: '#8b5cf6' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              Embed Widget
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="terminal-block flex-1 truncate" style={{ fontSize: 10, color: '#a78bfa' }}>
                              {`<script src="${window.location.origin}/embed.js" data-agent="${dep.slug}"></script>`}
                            </div>
                            <button
                              onClick={() => copyToClipboard(`<script src="${window.location.origin}/embed.js" data-agent="${dep.slug}"></script>`, 'embed')}
                              className={`copy-btn ${copied === 'embed' ? 'copied' : ''}`}
                            >
                              {copied === 'embed' ? <Check size={13} style={{ color: '#00ff88' }} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>

                        {/* API Endpoint */}
                        <div style={{
                          background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.06)', padding: 16
                        }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Terminal size={14} style={{ color: '#00f0ff' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              API Endpoint
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="terminal-block flex-1 truncate" style={{ fontSize: 11 }}>
                              <span style={{ color: '#00f0ff' }}>POST</span>{' '}
                              <span style={{ color: '#00ff88' }}>{API_URL}/api/public/{dep.slug}/chat</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`curl -X POST ${API_URL}/api/public/${dep.slug}/chat -H "Content-Type: application/json" -d '{"message": "Hello"}'`, 'api')}
                              className={`copy-btn ${copied === 'api' ? 'copied' : ''}`}
                            >
                              {copied === 'api' ? <Check size={13} style={{ color: '#00ff88' }} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Stats and actions row */}
                      <div className="section-divider" style={{ marginBottom: 16 }} />
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex gap-5">
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                            <span style={{ color: '#00f0ff', fontWeight: 700 }}>{dep.total_conversations || 0}</span> conversations
                          </span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                            <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{dep.total_messages || 0}</span> messages
                          </span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                            <span style={{ color: '#00ff88', fontWeight: 700 }}>{dep.rate_limit_rpm}</span> req/min
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => regenMut.mutate(dep.id)}
                            className="game-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <RefreshCw size={11} /> Regenerate Token
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this deployment?')) deleteMut.mutate(dep.id) }}
                            className="game-btn-danger"
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {(agents as any[]).length === 0 && (
            <div className="game-card animate-fade-in" style={{
              padding: '60px 20px', textAlign: 'center',
              borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.08)'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={28} style={{ color: 'rgba(0, 240, 255, 0.3)' }} />
              </div>
              <h3 style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>No Agents in Hangar</h3>
              <p style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
                Create an agent first, then launch it from here.
              </p>
            </div>
          )}
        </div>

        {/* Deploy Modal */}
        {deployModal && (
          <div className="game-modal-overlay" onClick={() => setDeployModal(null)}>
            <div className="game-modal" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center gap-3 mb-1">
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Rocket size={16} className="neon-text" />
                </div>
                <div>
                  <h2 className="neon-text" style={{ fontSize: 16, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Launch Config
                  </h2>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 24, marginLeft: 44 }}>
                Configure deployment parameters before launch
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Welcome Message */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    className="game-input"
                    value={settings.welcome_message}
                    onChange={e => setSettings(s => ({ ...s, welcome_message: e.target.value }))}
                  />
                </div>

                {/* Theme Color */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Theme Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div style={{
                      position: 'relative', width: 40, height: 40, borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden'
                    }}>
                      <input
                        type="color"
                        style={{ position: 'absolute', inset: -4, width: 48, height: 48, cursor: 'pointer', border: 'none' }}
                        value={settings.theme_color}
                        onChange={e => setSettings(s => ({ ...s, theme_color: e.target.value }))}
                      />
                    </div>
                    <input
                      type="text"
                      className="game-input"
                      style={{ flex: 1, fontFamily: 'monospace' }}
                      value={settings.theme_color}
                      onChange={e => setSettings(s => ({ ...s, theme_color: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Rate Limit */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Rate Limit (req/min)
                  </label>
                  <input
                    type="number"
                    className="game-input"
                    value={settings.rate_limit_rpm}
                    onChange={e => setSettings(s => ({ ...s, rate_limit_rpm: parseInt(e.target.value) || 30 }))}
                  />
                </div>

                {/* Allowed Domains */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Allowed Domains
                    <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 6, letterSpacing: '0', textTransform: 'none' }}>
                      comma-separated, empty = all
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="example.com, app.example.com"
                    className="game-input"
                    value={settings.allowed_domains}
                    onChange={e => setSettings(s => ({ ...s, allowed_domains: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="section-divider" style={{ margin: '24px 0' }} />
              <div className="flex gap-3">
                <button
                  onClick={() => setDeployModal(null)}
                  className="game-btn-secondary"
                  style={{ flex: 1, padding: '12px 16px', fontSize: 12, textAlign: 'center', justifyContent: 'center', display: 'flex' }}
                >
                  Abort
                </button>
                <button
                  onClick={() => deployMut.mutate(deployModal)}
                  disabled={deployMut.isPending}
                  className="game-btn"
                  style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                >
                  {deployMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                  {deployMut.isPending ? 'Launching...' : 'Launch Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
