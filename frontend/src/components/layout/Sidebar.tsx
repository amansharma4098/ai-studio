'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Bot, Star, Key, Activity,
  Terminal, GitBranch, FileText, LogOut, Zap
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navSections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/playground', label: 'Playground', icon: Terminal },
    ],
  },
  {
    label: 'Configure',
    items: [
      { href: '/skills', label: 'Skills Library', icon: Star },
      { href: '/credentials', label: 'Credentials', icon: Key },
    ],
  },
  {
    label: 'Automate',
    items: [
      { href: '/workflows', label: 'Workflows', icon: GitBranch },
      { href: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Observe',
    items: [
      { href: '/monitoring', label: 'Monitoring', icon: Activity },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[228px] flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-400 text-xs font-bold text-white shadow-lg shadow-violet-500/30">
          <Zap size={14} />
        </div>
        <span className="text-sm font-bold tracking-tight">
          AI Studio
          <span className="ml-1.5 rounded bg-violet-500/15 px-1 py-0.5 text-[10px] font-semibold text-violet-400">v3</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1.5 py-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded px-2.5 py-[7px] text-[12.5px] font-medium transition-all',
                    active
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                  )}
                >
                  <item.icon size={14} className="shrink-0 opacity-90" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-bold text-violet-400 ring-1 ring-violet-500/25">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user?.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.organization || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
