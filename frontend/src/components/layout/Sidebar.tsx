'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Bot, Star, Key, Activity,
  Terminal, GitBranch, FileText, LogOut, Zap, Menu, X
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navSections = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/playground', label: 'Playground', icon: Terminal },
    ],
  },
  {
    label: 'CONFIGURE',
    items: [
      { href: '/skills', label: 'Skills Library', icon: Star },
      { href: '/credentials', label: 'Credentials', icon: Key },
    ],
  },
  {
    label: 'AUTOMATE',
    items: [
      { href: '/workflows', label: 'Workflows', icon: GitBranch },
      { href: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'OBSERVE',
    items: [
      { href: '/monitoring', label: 'Monitoring', icon: Activity },
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
    router.push('/login')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-[15px] font-bold text-white tracking-tight">AI Studio</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navSections.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all mb-0.5"
                  style={active
                    ? { background: '#10b981', color: '#ffffff' }
                    : { color: '#94a3b8' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <item.icon size={16} className="shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[12px] font-bold text-emerald-400">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{user?.name || 'User'}</p>
            <p className="truncate text-[11px]" style={{ color: '#64748b' }}>{user?.organization || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded p-1.5 transition-colors"
            style={{ color: '#64748b' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
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
      <div className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between px-4 lg:hidden" style={{ background: '#1e293b' }}>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 text-white">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">AI Studio</span>
        </div>
        <div className="w-[34px]" /> {/* Spacer for centering */}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col"
            style={{ background: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col lg:flex" style={{ background: '#1e293b' }}>
        <SidebarContent />
      </aside>
    </>
  )
}
