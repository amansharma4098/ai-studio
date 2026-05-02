'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Crown, Shield, Eye, UserPlus, Trash2, Loader2, Building2 } from 'lucide-react'
import { api } from '@/lib/api'

const ROLE_ICONS: Record<string, any> = { owner: Crown, admin: Shield, member: Users, viewer: Eye }
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
}

export default function TeamsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/teams/', { name, description }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setShowCreate(false); setName(''); setDescription('') },
  })

  const inviteMutation = useMutation({
    mutationFn: (teamId: string) => api.post(`/teams/${teamId}/invite`, { email: inviteEmail, role: inviteRole }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setShowInvite(null); setInviteEmail('') },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in" style={{ background: '#13141d', minHeight: '100vh' }}>

      {/* Page Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold neon-text" style={{ letterSpacing: '0.5px' }}>
            Guild Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#8b92a8' }}>
            Manage your squads and recruit allies for AI missions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
          >
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.6)' }}
            />
            <span className="text-xs font-medium" style={{ color: '#00ff88' }}>
              {(teams as any[]).length} Guild{(teams as any[]).length !== 1 ? 's' : ''} Active
            </span>
          </div>
          <button onClick={() => setShowCreate(true)} className="game-btn flex items-center gap-2">
            <Plus size={16} /> Create Guild
          </button>
        </div>
      </div>

      {/* Create Team Modal -- Guild Creation Form */}
      {showCreate && (
        <div className="game-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="game-modal w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Modal Header with gradient accent */}
            <div
              className="relative px-6 pt-6 pb-4"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #00f0ff, #8b5cf6, #ff00aa)',
                }}
              />
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,240,255,0.1))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    boxShadow: '0 0 15px rgba(139,92,246,0.15)',
                  }}
                >
                  <Building2 size={20} style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold neon-text">Forge New Guild</h2>
                  <p className="text-[11px]" style={{ color: '#8b92a8' }}>Establish your team headquarters</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b92a8' }}>
                  Guild Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter guild name..."
                  className="game-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b92a8' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Guild motto or mission statement (optional)"
                  rows={2}
                  className="game-input"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div
              className="flex justify-end gap-3 px-6 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button onClick={() => setShowCreate(false)} className="game-btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                className="game-btn flex items-center gap-2"
              >
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                Forge Guild
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal -- Recruit Member Screen */}
      {showInvite && (
        <div className="game-modal-overlay" onClick={() => setShowInvite(null)}>
          <div className="game-modal w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              className="relative px-6 pt-6 pb-4"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, #00ff88, #00f0ff)',
                }}
              />
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,240,255,0.1))',
                    border: '1px solid rgba(0,255,136,0.3)',
                    boxShadow: '0 0 15px rgba(0,255,136,0.15)',
                  }}
                >
                  <UserPlus size={20} style={{ color: '#00ff88', filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.5))' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold neon-text-green">Recruit Member</h2>
                  <p className="text-[11px]" style={{ color: '#8b92a8' }}>Send an invite to join your guild</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b92a8' }}>
                  Recruit Email
                </label>
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="ally@example.com"
                  type="email"
                  className="game-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b92a8' }}>
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="game-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="member">Member -- Standard access</option>
                  <option value="admin">Admin -- Manage guild settings</option>
                  <option value="viewer">Viewer -- Read-only access</option>
                </select>
              </div>

              {/* Role Legend */}
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b92a8' }}>
                  Role Permissions
                </div>
                {[
                  { role: 'Admin', icon: Shield, color: '#8b5cf6', desc: 'Full guild management' },
                  { role: 'Member', icon: Users, color: '#00f0ff', desc: 'Deploy agents & run missions' },
                  { role: 'Viewer', icon: Eye, color: '#8b92a8', desc: 'Observe missions only' },
                ].map(r => (
                  <div key={r.role} className="flex items-center gap-2">
                    <r.icon size={12} style={{ color: r.color, filter: `drop-shadow(0 0 4px ${r.color}60)` }} />
                    <span className="text-[11px] font-semibold" style={{ color: r.color }}>{r.role}</span>
                    <span className="text-[11px]" style={{ color: '#6b7394' }}>{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex justify-end gap-3 px-6 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button onClick={() => setShowInvite(null)} className="game-btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => inviteMutation.mutate(showInvite)}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="game-btn flex items-center gap-2"
              >
                {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List -- Guild Roster */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin" size={28} style={{ color: '#00f0ff', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.5))' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8b92a8' }}>Loading guilds...</span>
        </div>
      ) : (teams as any[]).length === 0 ? (
        /* Empty State -- No Squads */
        <div
          className="game-card relative overflow-hidden"
          style={{ padding: '2px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,240,255,0.2), rgba(255,0,170,0.2))', borderRadius: '16px' }}
        >
          <div
            className="rounded-[14px] p-12 text-center relative"
            style={{ background: 'linear-gradient(135deg, rgba(18,18,26,0.98), rgba(10,10,15,0.99))' }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 rounded-[14px] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
            <div className="relative">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl animate-float"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,240,255,0.1))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 30px rgba(139,92,246,0.2), 0 0 60px rgba(0,240,255,0.1)',
                }}
              >
                <Users size={28} style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.6))' }} />
              </div>
              <h3 className="text-lg font-bold neon-text mb-2">No Squads Found</h3>
              <p className="text-sm mb-6" style={{ color: '#8b92a8' }}>
                Create your first guild to assemble your team and conquer AI missions together.
              </p>
              <button onClick={() => setShowCreate(true)} className="game-btn flex items-center gap-2 mx-auto">
                <Plus size={16} /> Forge Your First Guild
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(teams as any[]).map((team: any, idx: number) => (
            <div
              key={team.id}
              className="game-card relative overflow-hidden animate-fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* Guild Banner Top Accent -- color varies by plan */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: team.plan === 'enterprise'
                    ? 'linear-gradient(90deg, #8b5cf6, #ff00aa, #8b5cf6)'
                    : team.plan === 'pro'
                    ? 'linear-gradient(90deg, #00f0ff, #8b5cf6, #00f0ff)'
                    : 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                }}
              />

              {/* Subtle grid pattern overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0,240,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.015) 1px, transparent 1px)',
                  backgroundSize: '25px 25px',
                }}
              />

              <div className="relative p-5">
                {/* Guild Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        background: team.plan === 'enterprise'
                          ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(255,0,170,0.15))'
                          : team.plan === 'pro'
                          ? 'linear-gradient(135deg, rgba(0,240,255,0.25), rgba(139,92,246,0.15))'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                        border: team.plan === 'enterprise'
                          ? '1px solid rgba(139,92,246,0.3)'
                          : team.plan === 'pro'
                          ? '1px solid rgba(0,240,255,0.3)'
                          : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: team.plan === 'enterprise'
                          ? '0 0 15px rgba(139,92,246,0.15)'
                          : team.plan === 'pro'
                          ? '0 0 15px rgba(0,240,255,0.15)'
                          : 'none',
                      }}
                    >
                      <Building2
                        size={20}
                        style={{
                          color: team.plan === 'enterprise' ? '#a78bfa' : team.plan === 'pro' ? '#00f0ff' : '#8b92a8',
                          filter: team.plan !== 'free'
                            ? `drop-shadow(0 0 4px ${team.plan === 'enterprise' ? 'rgba(139,92,246,0.5)' : 'rgba(0,240,255,0.5)'})`
                            : 'none',
                        }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-bold"
                        style={{
                          color: '#eef0f6',
                        }}
                      >
                        {team.name}
                      </h3>
                      <p className="text-[11px] font-mono" style={{ color: '#6b7394' }}>{team.slug}</p>
                    </div>
                  </div>

                  {/* Plan Badge */}
                  <span
                    className={
                      team.plan === 'enterprise' ? 'badge-purple' :
                      team.plan === 'pro' ? 'badge-info' :
                      ''
                    }
                    style={
                      team.plan === 'free' ? {
                        background: 'rgba(255,255,255,0.04)',
                        color: '#6b7394',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase' as const,
                      } : {
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase' as const,
                        boxShadow: team.plan === 'enterprise'
                          ? '0 0 10px rgba(139,92,246,0.15)'
                          : '0 0 10px rgba(0,240,255,0.15)',
                      }
                    }
                  >
                    {team.plan}
                  </span>
                </div>

                {/* Guild Description */}
                {team.description && (
                  <p className="text-[12px] mb-4" style={{ color: '#8b92a8', lineHeight: '1.5' }}>
                    {team.description}
                  </p>
                )}

                {/* Guild Stats HUD Boxes */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div
                    className="rounded-lg p-2.5 text-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.02))',
                      border: '1px solid rgba(0,240,255,0.1)',
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 w-8 h-[2px]"
                      style={{ background: 'linear-gradient(90deg, #00f0ff, transparent)' }}
                    />
                    <div
                      className="text-lg font-bold font-mono"
                      style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.3)' }}
                    >
                      {team.member_count}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b92a8' }}>
                      Members
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-2.5 text-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(139,92,246,0.02))',
                      border: '1px solid rgba(139,92,246,0.1)',
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 w-8 h-[2px]"
                      style={{ background: 'linear-gradient(90deg, #8b5cf6, transparent)' }}
                    />
                    <div
                      className="text-lg font-bold font-mono"
                      style={{ color: '#a78bfa', textShadow: '0 0 12px rgba(139,92,246,0.3)' }}
                    >
                      {team.runs_this_month}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b92a8' }}>
                      Runs
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-2.5 text-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,255,136,0.02))',
                      border: '1px solid rgba(0,255,136,0.1)',
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 w-8 h-[2px]"
                      style={{ background: 'linear-gradient(90deg, #00ff88, transparent)' }}
                    />
                    <div
                      className="text-lg font-bold font-mono"
                      style={{ color: '#00ff88', textShadow: '0 0 12px rgba(0,255,136,0.3)' }}
                    >
                      {team.max_agents === -1 ? '\u221E' : team.max_agents}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b92a8' }}>
                      Max Agents
                    </div>
                  </div>
                </div>

                {/* Recruit / Invite Button */}
                <button
                  onClick={() => setShowInvite(team.id)}
                  className="game-btn-secondary w-full flex items-center justify-center gap-2"
                  style={{ padding: '10px 20px' }}
                >
                  <UserPlus size={14} /> Recruit Member
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
