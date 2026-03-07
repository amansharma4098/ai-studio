'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronDown, ChevronRight, ExternalLink, Shield, Globe } from 'lucide-react'
import { skillsApi } from '@/lib/api'

const CATEGORY_META: Record<string, { color: string; border: string; glow: string }> = {
  'cat-entra': { color: '#6264a7', border: 'border-indigo-500/30', glow: 'bg-indigo-500/10' },
  'cat-azure': { color: '#0089d6', border: 'border-blue-500/30', glow: 'bg-blue-500/10' },
  'cat-web': { color: '#38bdf8', border: 'border-sky-500/30', glow: 'bg-sky-500/10' },
  'cat-data': { color: '#c084fc', border: 'border-purple-500/30', glow: 'bg-purple-500/10' },
  'cat-comm': { color: '#10d9a0', border: 'border-emerald-500/30', glow: 'bg-emerald-500/10' },
  'cat-devops': { color: '#f5a623', border: 'border-amber-500/30', glow: 'bg-amber-500/10' },
}

const BADGE_CLASS: Record<string, string> = {
  'cat-entra': 'bg-indigo-500/15 text-indigo-400',
  'cat-azure': 'bg-blue-500/15 text-blue-400',
  'cat-web': 'bg-sky-500/15 text-sky-400',
  'cat-data': 'bg-purple-500/15 text-purple-400',
  'cat-comm': 'bg-emerald-500/15 text-emerald-400',
  'cat-devops': 'bg-amber-500/15 text-amber-400',
}

interface Skill {
  id: string; name: string; label: string; desc: string; icon: string; params: string[];
}
interface TagGroup { tag: string; skills: Skill[] }
interface Category {
  id: string; name: string; icon: string; credType: string;
  tags: TagGroup[];
}

export default function SkillsPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedSkill, setSelectedSkill] = useState<Skill & { catId: string } | null>(null)

  const { data: catalog = [], isLoading } = useQuery<Category[]>({
    queryKey: ['skills-catalog'],
    queryFn: () => skillsApi.getCatalog().then(r => r.data),
  })

  // Filter by search
  const filtered = search.trim()
    ? catalog.map(cat => ({
        ...cat,
        tags: cat.tags.map(t => ({
          ...t,
          skills: t.skills.filter(s =>
            s.label.toLowerCase().includes(search.toLowerCase()) ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.desc.toLowerCase().includes(search.toLowerCase())
          )
        })).filter(t => t.skills.length > 0)
      })).filter(cat => cat.tags.length > 0)
    : catalog

  const toggleCat = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }))

  const totalSkills = catalog.reduce((a, c) => a + c.tags.reduce((b, t) => b + t.skills.length, 0), 0)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Skills Library</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalSkills} pre-built skills across {catalog.length} categories
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          placeholder="Search skills — e.g. create group, cosmos metrics, forecast cost..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        {catalog.map(cat => {
          const meta = CATEGORY_META[cat.id] || {}
          const badge = BADGE_CLASS[cat.id] || 'bg-muted text-muted-foreground'
          const count = cat.tags.reduce((a, t) => a + t.skills.length, 0)
          return (
            <button
              key={cat.id}
              onClick={() => setSearch('')}
              className={`flex items-center gap-1.5 rounded-md border ${meta.border || 'border-border'} px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80`}
            >
              <span>{cat.icon}</span>
              {cat.name}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="text-center py-20 text-muted-foreground">Loading skill catalog...</div>
      )}

      {/* Categories */}
      {filtered.map(cat => {
        const meta = CATEGORY_META[cat.id] || {}
        const badge = BADGE_CLASS[cat.id] || 'bg-muted text-muted-foreground'
        const isOpen = expanded[cat.id] !== false
        const count = cat.tags.reduce((a, t) => a + t.skills.length, 0)
        const needsCred = cat.credType === 'entra' || cat.credType === 'azure'

        return (
          <div key={cat.id} className="mb-6">
            {/* Category Header */}
            <button
              onClick={() => toggleCat(cat.id)}
              className={`flex w-full items-center gap-3 rounded-lg border ${meta.border || 'border-border'} p-3.5 transition-all hover:opacity-90 mb-3`}
              style={{ background: `color-mix(in srgb, ${meta.color} 6%, transparent)` }}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${meta.border} text-xl`}
                style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{cat.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>{count} skills</span>
                  {needsCred
                    ? <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"><Shield size={9} /> Requires Credential</span>
                    : <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"><Globe size={9} /> No Auth Required</span>
                  }
                </div>
              </div>
              {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
            </button>

            {isOpen && cat.tags.map(tg => (
              <div key={tg.tag} className="mb-4 ml-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 pl-1">
                  {tg.tag} <span className="font-normal">({tg.skills.length})</span>
                </p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tg.skills.map(sk => (
                    <button
                      key={sk.id}
                      onClick={() => setSelectedSkill({ ...sk, catId: cat.id })}
                      className={`group relative rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-violet-500/50 hover:bg-accent`}
                    >
                      <div className="mb-2 text-xl">{sk.icon}</div>
                      <div className="mb-1 text-[12.5px] font-semibold leading-tight">{sk.label}</div>
                      <div className="mb-2 text-[11px] text-muted-foreground leading-snug line-clamp-2">{sk.desc}</div>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge}`}>{tg.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-sm font-semibold text-muted-foreground">No skills match "{search}"</p>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (() => {
        const cat = filtered.find(c => c.id === selectedSkill.catId)
        const meta = CATEGORY_META[selectedSkill.catId] || {}
        const badge = BADGE_CLASS[selectedSkill.catId] || 'bg-muted text-muted-foreground'
        const needsCred = cat?.credType === 'entra' || cat?.credType === 'azure'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setSelectedSkill(null)}>
            <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-border p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${meta.border} text-2xl`}
                  style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
                  {selectedSkill.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{selectedSkill.label}</h2>
                  <p className="text-xs text-muted-foreground">{cat?.name}</p>
                </div>
                <button onClick={() => setSelectedSkill(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedSkill.desc}</p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Function Name</label>
                  <div className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-purple-400">
                    {selectedSkill.name}()
                  </div>
                </div>
                {selectedSkill.params?.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Parameters</label>
                    <div className="space-y-1.5">
                      {selectedSkill.params.map(p => (
                        <div key={p} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                          <code className="text-[11.5px] text-amber-400">{p}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`rounded-lg p-3 text-xs ${needsCred ? 'bg-amber-500/8 border border-amber-500/20 text-amber-300' : 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-300'}`}>
                  {needsCred
                    ? '🔐 Requires Microsoft credential — Client ID + Secret + Tenant ID → OAuth2 token injected at runtime'
                    : '✓ No credential required — available out of the box'}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
