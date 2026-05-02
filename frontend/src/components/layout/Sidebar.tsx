'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Bot, Star, Key, Activity,
  Terminal, GitBranch, FileText, LogOut, Zap, Menu, X,
  Wand2, Users, KeyRound, CreditCard, Shield, Rocket
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navSections = [
  {
    label: 'COMMAND',
    items: [
      { href: '/dashboard', label: 'HQ Dashboard', icon: LayoutDashboard },
      { href: '/agent-builder', label: 'Forge Agent', icon: Wand2, badge: 'AI' },
      { href: '/agents', label: 'Agent Fleet', icon: Bot },
      { href: '/playground', label: 'Arena', icon: Terminal },
    ],
  },
  {
    label: 'LOADOUT',
    items: [
      { href: '/skills', label: 'Skill Tree', icon: Star },
      { href: '/credentials', label: 'Vault', icon: Key },
    ],
  },
  {
    label: 'LAUNCH',
    items: [
      { href: '/deployments', label: 'Deployments', icon: Rocket, badge: 'NEW' },
    ],
  },
  {
    label: 'MISSIONS',
    items: [
      { href: '/workflows', label: 'Workflows', icon: GitBranch },
      { href: '/documents', label: 'Intel Docs', icon: FileText },
    ],
  },
  {
    label: 'GUILD',
    items: [
      { href: '/teams', label: 'Squads', icon: Users },
      { href: '/api-keys', label: 'Access Keys', icon: KeyRound },
      { href: '/billing', label: 'Power-Ups', icon: CreditCard },
    ],
  },
  {
    label: 'RECON',
    items: [
      { href: '/monitoring', label: 'War Room', icon: Activity },
    ],
  },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    localStorage.removeItem('token')
    logout()
    router.push('/dashboard')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', boxShadow: '0 0 20px rgba(0,240,255,0.3)' }}>
          <Zap size={18} className="text-black" />
        </div>
        <div>
          <span className="text-[15px] font-black tracking-tight" style={{ color: '#00f0ff' }}>AI STUDIO</span>
          <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-black"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>v5</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="mx-4 mb-3 rounded-lg px-3 py-2 flex items-center gap-2"
        style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.08)' }}>
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88', animation: 'pulse-glow 2s ease-in-out infinite' }} />
        <span className="text-[10px]" style={{ color: '#8b92a8' }}>
          MULTI-MODEL <span className="font-bold" style={{ color: '#00f0ff' }}>ONLINE</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-3 py-2 text-[9px] font-black uppercase tracking-[3px]" style={{ color: '#6b7394' }}>
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-300 mb-0.5 relative overflow-hidden"
                  style={active
                    ? {
                        background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.08))',
                        color: '#00f0ff',
                        borderLeft: '2px solid #00f0ff',
                        boxShadow: 'inset 0 0 20px rgba(0,240,255,0.05)',
                      }
                    : { color: '#8b92a8', borderLeft: '2px solid transparent' }}
                >
                  <item.icon size={16} className="shrink-0" style={active ? { filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.5))' } : {}} />
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-black"
                      style={item.badge === 'NEW'
                        ? { background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }
                        : { background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }
                      }>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-black"
            style={{ background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>
            {user?.name?.[0]?.toUpperCase() ?? 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold" style={{ color: '#e2e8f0' }}>{user?.name || 'Player 1'}</p>
            <p className="truncate text-[10px]" style={{ color: '#6b7394' }}>{user?.organization || 'Solo Mode'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 transition-all duration-300"
            style={{ color: '#6b7394' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff4d6a'; e.currentTarget.style.background = 'rgba(255,0,85,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7394'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between px-4 lg:hidden"
        style={{ background: '#111220', borderBottom: '1px solid rgba(0,240,255,0.08)' }}>
        <button onClick={() => setMobileOpen(true)} className="p-1.5" style={{ color: '#00f0ff' }}>
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)' }}>
            <Zap size={14} className="text-black" />
          </div>
          <span className="text-sm font-black tracking-tight" style={{ color: '#00f0ff' }}>AI STUDIO</span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-black"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>v5</span>
        </div>
        <div className="w-[34px]" />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
          <aside
            className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col"
            style={{ background: '#111220', borderRight: '1px solid rgba(0,240,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setMobileOpen(false)} className="p-1" style={{ color: '#8b92a8' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col lg:flex"
        style={{ background: '#111220', borderRight: '1px solid rgba(0,240,255,0.06)' }}>
        <SidebarContent />
      </aside>
    </>
  )
}
