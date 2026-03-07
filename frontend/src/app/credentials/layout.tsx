'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  useEffect(() => { if (!isAuthenticated()) router.replace('/login') }, [])
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[228px] flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
