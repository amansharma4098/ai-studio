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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teams & Workspaces</h1>
          <p className="mt-1 text-sm text-slate-500">Collaborate with your team on AI agents</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus size={16} /> New Team
        </button>
      </div>

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create Team</h2>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Team name" className="w-full rounded-lg border border-slate-200 p-3 text-sm mb-3 focus:border-emerald-400 focus:outline-none" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-slate-200 p-3 text-sm mb-4 focus:border-emerald-400 focus:outline-none resize-none" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInvite(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Invite Member</h2>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" type="email" className="w-full rounded-lg border border-slate-200 p-3 text-sm mb-3 focus:border-emerald-400 focus:outline-none" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full rounded-lg border border-slate-200 p-3 text-sm mb-4 focus:border-emerald-400 focus:outline-none">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowInvite(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => inviteMutation.mutate(showInvite)} disabled={!inviteEmail.trim() || inviteMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (teams as any[]).length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500 mb-4">No teams yet. Create one to start collaborating.</p>
          <button onClick={() => setShowCreate(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Create Your First Team</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(teams as any[]).map((team: any) => (
            <div key={team.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{team.name}</h3>
                    <p className="text-[11px] text-slate-400">{team.slug}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  team.plan === 'enterprise' ? 'bg-amber-100 text-amber-700' :
                  team.plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{team.plan}</span>
              </div>

              {team.description && <p className="text-[12px] text-slate-500 mb-4">{team.description}</p>}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-lg font-bold text-slate-800">{team.member_count}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Members</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-lg font-bold text-slate-800">{team.runs_this_month}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Runs</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-600">{team.max_agents === -1 ? 'Unlimited' : team.max_agents}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Max Agents</div>
                </div>
              </div>

              <button
                onClick={() => setShowInvite(team.id)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-200 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <UserPlus size={14} /> Invite Member
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
