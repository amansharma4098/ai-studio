'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { publicAgentApi } from '@/lib/api'
import { Send, Loader2, Bot, User, Zap } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function SharedAgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [info, setInfo] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load agent info
  useEffect(() => {
    if (!slug) return
    publicAgentApi.getInfo(slug)
      .then(r => {
        setInfo(r.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Agent not found or is no longer available.')
        setLoading(false)
      })

    // Restore session
    const saved = localStorage.getItem(`share-session-${slug}`)
    if (saved) {
      setSessionId(saved)
      publicAgentApi.history(slug, saved)
        .then(r => { if (r.data.messages?.length) setMessages(r.data.messages) })
        .catch(() => {})
    }
  }, [slug])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setSending(true)

    try {
      const res = await publicAgentApi.chat(slug, userMessage, sessionId || undefined)
      const data = res.data
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.session_id) {
        setSessionId(data.session_id)
        localStorage.setItem(`share-session-${slug}`, data.session_id)
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to send message. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const themeColor = info?.theme_color || '#10b981'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Bot size={48} className="mx-auto mb-4 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-800">Agent Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: themeColor + '20' }}>
          <Bot size={18} style={{ color: themeColor }} />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-slate-800">{info?.name || 'AI Assistant'}</h1>
          {info?.description && <p className="text-[11px] text-slate-500 truncate">{info.description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
          <span className="text-[10px] font-medium text-slate-500">Online</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && info?.welcome_message && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: themeColor + '20' }}>
                <Bot size={14} style={{ color: themeColor }} />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-slate-100 max-w-[80%]">
                <p className="text-sm text-slate-700">{info.welcome_message}</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-slate-700' : ''
              }`} style={msg.role === 'assistant' ? { backgroundColor: themeColor + '20' } : undefined}>
                {msg.role === 'user'
                  ? <User size={14} className="text-white" />
                  : <Bot size={14} style={{ color: themeColor }} />
                }
              </div>
              <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                msg.role === 'user'
                  ? 'rounded-tr-md text-white'
                  : 'rounded-tl-md bg-white shadow-sm border border-slate-100'
              }`} style={msg.role === 'user' ? { backgroundColor: themeColor } : undefined}>
                <p className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: themeColor + '20' }}>
                <Bot size={14} style={{ color: themeColor }} />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder={info?.placeholder_text || 'Type your message...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ backgroundColor: themeColor, color: '#fff' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
          {info?.show_branding !== false && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Zap size={10} className="text-slate-300" />
              <span className="text-[10px] text-slate-400">Powered by AI Studio</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
