'use client'
import { Sidebar } from '@/components/layout/Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#13141d' }}>
      <Sidebar />
      <main className="pt-14 lg:ml-[240px] lg:pt-0 flex-1 overflow-y-auto page-bg grid-pattern">{children}</main>
    </div>
  )
}
