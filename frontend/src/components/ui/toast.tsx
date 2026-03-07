'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
interface ToastContextType { addToast: (message: string, type?: Toast['type']) => void }

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
            t.type === 'success' ? 'border-emerald-500/30 bg-card text-emerald-400' :
            t.type === 'error' ? 'border-red-500/30 bg-card text-red-400' :
            'border-border bg-card text-foreground'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
