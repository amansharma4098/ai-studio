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
          <div key={t.id} className={`rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            t.type === 'success' ? 'border-emerald-300 bg-white text-emerald-700' :
            t.type === 'error' ? 'border-red-300 bg-white text-red-600' :
            'border-slate-200 bg-white text-slate-700'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
