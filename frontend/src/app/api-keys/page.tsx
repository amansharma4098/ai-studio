'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, Check, Trash2, Loader2, Shield, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['agents:read', 'agents:execute'])
  const [expiresDays, setExpiresDays] = useState<string>('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys/').then(r => r.data),
  })

  const { data: availableScopes = [] } = useQuery({
    queryKey: ['api-key-scopes'],
    queryFn: () => api.get('/api-keys/scopes').then(r => r.data.scopes),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/api-keys/', {
      name,
      scopes,
      expires_days: expiresDays ? parseInt(expiresDays) : null,
    }).then(r => r.data),
    onSuccess: (data) => {
      setNewKey(data.full_key)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setName('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const toggleScope = (scope: string) => {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes pulseNeon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(0, 240, 255, 0.3), inset 0 0 8px rgba(0, 240, 255, 0.05); }
          50% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.1); }
        }
        @keyframes classifiedPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.4), 0 0 30px rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.7), 0 0 50px rgba(239, 68, 68, 0.4); }
        }
        @keyframes flashCopy {
          0% { background: rgba(0, 240, 255, 0.3); }
          50% { background: rgba(0, 240, 255, 0.6); }
          100% { background: rgba(0, 240, 255, 0.3); }
        }
        @keyframes forgeGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.2); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .neon-text {
          color: #00f0ff;
          text-shadow: 0 0 7px rgba(0, 240, 255, 0.6), 0 0 20px rgba(0, 240, 255, 0.3);
        }
        .neon-text-purple {
          color: #8b5cf6;
          text-shadow: 0 0 7px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .neon-text-green {
          color: #00ff88;
          text-shadow: 0 0 7px rgba(0, 255, 136, 0.6), 0 0 20px rgba(0, 255, 136, 0.3);
        }
        .game-card {
          background: linear-gradient(145deg, rgba(20, 20, 35, 0.95), rgba(15, 15, 28, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          position: relative;
          overflow: hidden;
        }
        .game-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4), transparent);
        }
        .game-btn {
          background: linear-gradient(135deg, #00f0ff, #8b5cf6);
          color: #0a0a14;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .game-btn:hover {
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(139, 92, 246, 0.2);
          transform: translateY(-1px);
        }
        .game-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .game-btn-secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .game-btn-secondary:hover {
          color: rgba(255, 255, 255, 0.8);
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
        }
        .game-btn-danger {
          background: transparent;
          color: rgba(255, 80, 80, 0.7);
          border: none;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .game-btn-danger:hover {
          color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
          box-shadow: 0 0 12px rgba(255, 68, 68, 0.2);
        }
        .game-btn-danger:disabled {
          opacity: 0.2;
          cursor: not-allowed;
          box-shadow: none;
        }
        .game-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          outline: none;
          transition: all 0.25s ease;
        }
        .game-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        .game-input:focus {
          border-color: rgba(0, 240, 255, 0.4);
          box-shadow: 0 0 12px rgba(0, 240, 255, 0.15), inset 0 0 8px rgba(0, 240, 255, 0.05);
        }
        .game-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
        }
        .game-modal {
          width: 100%;
          max-width: 540px;
          background: linear-gradient(160deg, rgba(22, 22, 40, 0.99), rgba(12, 12, 26, 0.99));
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.3s ease-out forwards, forgeGlow 3s ease-in-out infinite;
        }
        .game-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #8b5cf6, #00f0ff, #8b5cf6, transparent);
        }
        .game-modal::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.03) 0%, transparent 40%);
          pointer-events: none;
        }
        .badge-success {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.2);
          text-shadow: 0 0 6px rgba(0, 255, 136, 0.4);
        }
        .badge-success::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 6px #00ff88;
          animation: pulseNeon 2s ease-in-out infinite;
        }
        .badge-danger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 80, 80, 0.6);
          background: rgba(255, 80, 80, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.15);
        }
        .badge-danger::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 80, 80, 0.5);
        }
        .badge-info {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          font-family: monospace;
          color: #00f0ff;
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.15);
        }
        .classified-border {
          animation: classifiedPulse 2.5s ease-in-out infinite;
        }
        .copy-flash {
          animation: flashCopy 0.4s ease-out;
        }
        .scope-checkbox {
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .scope-checkbox:checked {
          border-color: #00f0ff;
          background: rgba(0, 240, 255, 0.15);
          box-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
        }
        .scope-checkbox:checked::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 5px;
          width: 4px;
          height: 8px;
          border: solid #00f0ff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          filter: drop-shadow(0 0 3px #00f0ff);
        }
        .key-row {
          transition: all 0.2s ease;
        }
        .key-row:hover {
          background: rgba(0, 240, 255, 0.03);
        }
        .terminal-block {
          position: relative;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 12px;
          overflow: hidden;
        }
        .terminal-block::before {
          content: 'TERMINAL';
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: rgba(0, 255, 136, 0.25);
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
      `}</style>

      <div style={{ background: '#12121a', minHeight: '100vh' }} className="p-4 sm:p-6 lg:p-8">
        {/* Grid overlay background */}
        <div className="grid-overlay" style={{ position: 'fixed' }} />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(139, 92, 246, 0.15))',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={20} className="neon-text" />
              </div>
              <div>
                <h1 className="neon-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Access Keys
                </h1>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textTransform: 'uppercase', marginTop: 2 }}>
                  Security Terminal // Key Management Interface
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(true); setNewKey(null) }}
            className="game-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={15} /> Forge New Key
          </button>
        </div>

        {/* New Key Display - Classified Document */}
        {newKey && (
          <div
            className="animate-fade-in classified-border"
            style={{
              marginBottom: 28,
              borderRadius: 16,
              border: '2px solid rgba(245, 158, 11, 0.4)',
              background: 'linear-gradient(145deg, rgba(30, 20, 10, 0.95), rgba(20, 12, 8, 0.98))',
              padding: 24,
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden',
            }}
          >
            {/* Corner accents */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '2px solid rgba(239, 68, 68, 0.6)', borderLeft: '2px solid rgba(239, 68, 68, 0.6)' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '2px solid rgba(239, 68, 68, 0.6)', borderRight: '2px solid rgba(239, 68, 68, 0.6)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '2px solid rgba(239, 68, 68, 0.6)', borderLeft: '2px solid rgba(239, 68, 68, 0.6)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '2px solid rgba(239, 68, 68, 0.6)', borderRight: '2px solid rgba(239, 68, 68, 0.6)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Shield size={16} style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))' }} />
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                textShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
              }}>
                Classified // Save Now -- Will Not Be Shown Again
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 10,
              padding: 14,
            }}>
              <code style={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#f59e0b',
                wordBreak: 'break-all',
                textShadow: '0 0 6px rgba(245, 158, 11, 0.3)',
              }}>
                {newKey}
              </code>
              <button
                onClick={copyKey}
                className={copied ? 'copy-flash' : ''}
                style={{
                  flexShrink: 0,
                  borderRadius: 8,
                  padding: 10,
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  background: copied ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 240, 255, 0.1)',
                  color: copied ? '#00ff88' : '#00f0ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Create Modal - Key Forge */}
        {showCreate && !newKey && (
          <div className="game-modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="game-modal" onClick={e => e.stopPropagation()}>
              {/* Scanline effect */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.01) 2px, rgba(0, 240, 255, 0.01) 4px)',
                pointerEvents: 'none', zIndex: 0,
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 240, 255, 0.1))',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Key size={18} style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))' }} />
                  </div>
                  <div>
                    <h2 className="neon-text-purple" style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Key Forge
                    </h2>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                      Generate New Access Credential
                    </p>
                  </div>
                </div>

                {/* Name field */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
                    Key Designation
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Production Backend"
                    className="game-input"
                  />
                </div>

                {/* Scopes */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
                    Permission Scopes
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(availableScopes as string[]).map(scope => (
                      <label
                        key={scope}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: `1px solid ${scopes.includes(scope) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                          background: scopes.includes(scope) ? 'rgba(0, 240, 255, 0.05)' : 'rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={scopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                          className="scope-checkbox"
                        />
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: scopes.includes(scope) ? '#00f0ff' : 'rgba(255,255,255,0.4)' }}>
                          {scope}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Expiry */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
                    Auto-Destruct (Days)
                  </label>
                  <input
                    value={expiresDays}
                    onChange={e => setExpiresDays(e.target.value)}
                    placeholder="Leave empty for no expiry"
                    type="number"
                    className="game-input"
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button onClick={() => setShowCreate(false)} className="game-btn-secondary">
                    Abort
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!name.trim() || createMutation.isPending}
                    className="game-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                    Forge Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keys Table */}
        <div className="game-card animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px 120px 110px 50px',
            gap: 16,
            padding: '14px 22px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['Designation', 'Key Prefix', 'Scopes', 'Status', ''].map((h, i) => (
              <span key={i} style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'rgba(0, 240, 255, 0.4)',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Table body */}
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 className="animate-spin neon-text" size={22} />
            </div>
          ) : (keys as any[]).length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Key size={32} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>No access keys forged yet</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 4 }}>Generate your first key to begin</p>
            </div>
          ) : (
            (keys as any[]).map((key: any) => (
              <div
                key={key.id}
                className="key-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px 120px 110px 50px',
                  gap: 16,
                  padding: '14px 22px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  alignItems: 'center',
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: key.is_active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                }}>
                  {key.name}
                </span>

                <code style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: key.is_active ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.5px',
                }}>
                  {key.key_prefix}...{'*'.repeat(16)}
                </code>

                <span className="badge-info">
                  {key.scopes?.length || 0} scopes
                </span>

                <span className={key.is_active ? 'badge-success' : 'badge-danger'}>
                  {key.is_active ? 'Active' : 'Revoked'}
                </span>

                <button
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={!key.is_active}
                  className="game-btn-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Start Terminal */}
        <div className="animate-fade-in" style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
          <div className="game-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#00ff88',
                boxShadow: '0 0 8px #00ff88',
                animation: 'pulseNeon 2s ease-in-out infinite',
              }} />
              <h3 className="neon-text-green" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Quick Start // Integration Guide
              </h3>
            </div>

            <div className="terminal-block">
              {/* Terminal header bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                background: 'rgba(0, 255, 136, 0.03)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255, 80, 80, 0.6)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.6)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0, 255, 136, 0.6)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 8, letterSpacing: '1px' }}>bash</span>
              </div>

              <pre style={{
                padding: 18,
                fontSize: 12,
                fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
                color: '#00ff88',
                overflowX: 'auto',
                margin: 0,
                lineHeight: 1.7,
                textShadow: '0 0 6px rgba(0, 255, 136, 0.3)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>$</span>{' '}
{`curl -X POST https://api.yourdomain.com/api/agents/{agent_id}/run \\
  -H "Authorization: Bearer sk-aistudio-your-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{"input_text": "What are my Azure costs this month?"}'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
