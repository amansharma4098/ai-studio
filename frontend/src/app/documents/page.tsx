'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, FileText, Search, Loader2 } from 'lucide-react'
import { documentsApi } from '@/lib/api'

export default function DocumentsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [question, setQuestion] = useState('')
  const [model, setModel] = useState('anthropic/claude-sonnet')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [answer, setAnswer] = useState<{ answer: string; sources: any[] } | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: docs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const queryMut = useMutation({
    mutationFn: () => documentsApi.query(question, selectedDocs.length ? selectedDocs : undefined, model),
    onSuccess: r => setAnswer(r.data),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(file)
      qc.invalidateQueries({ queryKey: ['documents'] })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const toggleDoc = (id: string) =>
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    const colorMap: Record<string, string> = {
      pdf: '#ff4444',
      txt: '#00f0ff',
      md: '#8b5cf6',
      docx: '#3b82f6',
      csv: '#00ff88',
    }
    return colorMap[ext] || '#00f0ff'
  }

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', background: '#1c1d2b', padding: '24px 32px' }}>
      {/* Inline styles for gaming aesthetic */}
      <style>{`
        .game-card {
          background: linear-gradient(135deg, rgba(18,18,26,0.95), rgba(24,24,38,0.95));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }
        .game-card:hover {
          border-color: rgba(0,240,255,0.15);
          box-shadow: 0 0 20px rgba(0,240,255,0.05);
        }
        .game-btn {
          background: linear-gradient(135deg, #00f0ff, #8b5cf6);
          color: #1c1d2b;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 12px;
        }
        .game-btn:hover:not(:disabled) {
          box-shadow: 0 0 24px rgba(0,240,255,0.4), 0 0 48px rgba(139,92,246,0.2);
          transform: translateY(-1px);
        }
        .game-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .game-btn-secondary {
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.3);
          color: #8b5cf6;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .game-btn-secondary:hover {
          background: rgba(139,92,246,0.2);
          box-shadow: 0 0 16px rgba(139,92,246,0.2);
        }
        .game-btn-danger {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 6px;
          border-radius: 6px;
        }
        .game-btn-danger:hover {
          color: #ff4444;
          background: rgba(255,68,68,0.1);
          box-shadow: 0 0 12px rgba(255,68,68,0.2);
        }
        .game-input {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          color: #eef0f6;
          font-size: 13px;
          padding: 10px 14px;
          width: 100%;
          transition: all 0.3s ease;
          outline: none;
          font-family: inherit;
        }
        .game-input:focus {
          border-color: rgba(0,240,255,0.4);
          box-shadow: 0 0 16px rgba(0,240,255,0.1), inset 0 0 8px rgba(0,240,255,0.05);
        }
        .game-input::placeholder {
          color: rgba(255,255,255,0.2);
        }
        .badge-success {
          background: rgba(0,255,136,0.1);
          color: #00ff88;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0,255,136,0.2);
        }
        .badge-info {
          background: rgba(0,240,255,0.1);
          color: #00f0ff;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0,240,255,0.2);
        }
        .neon-text {
          background: linear-gradient(135deg, #00f0ff, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .upload-zone {
          border: 2px dashed rgba(0,240,255,0.25);
          border-radius: 12px;
          background: rgba(0,240,255,0.02);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .upload-zone:hover {
          border-color: rgba(0,240,255,0.6);
          background: rgba(0,240,255,0.05);
          box-shadow: 0 0 30px rgba(0,240,255,0.1), inset 0 0 30px rgba(0,240,255,0.03);
        }
        .doc-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .doc-row:last-child {
          border-bottom: none;
        }
        .doc-row:hover {
          background: rgba(0,240,255,0.03);
        }
        .doc-row.selected {
          background: rgba(0,240,255,0.06);
          border-left: 2px solid #00f0ff;
        }
        .pipeline-node {
          background: rgba(0,240,255,0.06);
          border: 1px solid rgba(0,240,255,0.15);
          color: #00f0ff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
        }
        .pipeline-node:nth-child(4n+3) {
          background: rgba(139,92,246,0.06);
          border-color: rgba(139,92,246,0.15);
          color: #8b5cf6;
        }
        .pipeline-node:nth-child(4n+5) {
          background: rgba(0,255,136,0.06);
          border-color: rgba(0,255,136,0.15);
          color: #00ff88;
        }
        .pipeline-arrow {
          color: rgba(255,255,255,0.12);
          font-size: 11px;
          font-weight: bold;
        }
        .terminal-output {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(0,255,136,0.15);
          border-radius: 8px;
          padding: 16px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #00ff88;
          white-space: pre-wrap;
          position: relative;
          overflow: hidden;
        }
        .terminal-output::before {
          content: '> OUTPUT';
          display: block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: rgba(0,255,136,0.35);
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,255,136,0.08);
        }
        .source-card {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 12px 14px;
          transition: all 0.3s ease;
        }
        .source-card:hover {
          border-color: rgba(139,92,246,0.2);
          box-shadow: 0 0 12px rgba(139,92,246,0.08);
        }
        .confidence-bar-bg {
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          height: 6px;
          width: 80px;
          overflow: hidden;
        }
        .confidence-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00f0ff, #00ff88);
          transition: width 0.5s ease;
          box-shadow: 0 0 8px rgba(0,240,255,0.4);
        }
        .glow-icon {
          filter: drop-shadow(0 0 4px currentColor);
          transition: all 0.3s ease;
        }
        .section-header {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          font-family: 'Courier New', monospace;
        }
        .scanline {
          position: relative;
        }
        .scanline::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,240,255,0.01) 2px,
            rgba(0,240,255,0.01) 4px
          );
          border-radius: inherit;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 8px #00ff88, 0 0 16px rgba(0,255,136,0.3)',
          }} />
          <h1 className="neon-text" style={{
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0,
            fontFamily: "'Courier New', monospace",
          }}>
            INTEL DATABASE
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: 2,
            color: 'rgba(0,240,255,0.4)', fontFamily: "'Courier New', monospace",
            marginLeft: 8,
          }}>
            v3.7.1 // CLASSIFIED
          </span>
        </div>
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0,
          fontFamily: "'Courier New', monospace", letterSpacing: 1,
        }}>
          Upload documents // LangChain chunks + embeds // ChromaDB // RAG query
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Column: Data Archives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload Zone */}
          <div
            className="upload-zone scanline"
            onClick={() => fileRef.current?.click()}
            style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.docx,.csv" onChange={handleUpload} />
            {uploading ? (
              <>
                <Loader2 size={28} className="animate-spin" style={{ color: '#00f0ff' }} />
                <p style={{ fontSize: 12, color: '#00f0ff', margin: 0, fontFamily: "'Courier New', monospace" }}>
                  UPLOADING AND INDEXING...
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Upload size={22} style={{ color: '#00f0ff' }} className="glow-icon" />
                </div>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: 0,
                  letterSpacing: 1, textTransform: 'uppercase',
                  fontFamily: "'Courier New', monospace",
                }}>
                  Upload Data File
                </p>
                <p style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0,
                  fontFamily: "'Courier New', monospace", letterSpacing: 0.5,
                }}>
                  PDF // TXT // MD // DOCX // CSV -- Max 50MB
                </p>
              </>
            )}
          </div>

          {/* RAG Pipeline Tech Tree */}
          <div className="game-card" style={{ padding: 16 }}>
            <p className="section-header" style={{ marginBottom: 12, marginTop: 0 }}>
              RAG PIPELINE // TECH TREE
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {['Upload', '\u2192', 'Text Split', '\u2192', 'Embeddings', '\u2192', 'ChromaDB', '\u2192', 'Similarity Search', '\u2192', 'Claude', '\u2192', 'Answer'].map((s, i) => (
                <span
                  key={i}
                  className={s === '\u2192' ? 'pipeline-arrow' : 'pipeline-node'}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Document List - Data Files */}
          <div className="game-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{
                  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                  margin: 0, textTransform: 'uppercase', letterSpacing: 2,
                  fontFamily: "'Courier New', monospace",
                }}>
                  Data Archives
                </h2>
                <p style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '4px 0 0 0',
                  fontFamily: "'Courier New', monospace",
                }}>
                  Select files to scope query parameters
                </p>
              </div>
              <span className="badge-info">
                {(docs as any[]).length} FILES
              </span>
            </div>

            <div>
              {(docs as any[]).length === 0 && (
                <div style={{
                  padding: '48px 16px', textAlign: 'center',
                  fontFamily: "'Courier New', monospace",
                }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                    // NO DATA FILES DETECTED
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', margin: '6px 0 0 0' }}>
                    Upload a document to initialize the archive
                  </p>
                </div>
              )}
              {(docs as any[]).map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`doc-row ${selectedDocs.includes(doc.id) ? 'selected' : ''}`}
                >
                  <FileText
                    size={16}
                    className="glow-icon"
                    style={{ color: selectedDocs.includes(doc.id) ? '#00f0ff' : getFileIcon(doc.file_name) }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, margin: 0,
                      color: selectedDocs.includes(doc.id) ? '#00f0ff' : 'rgba(255,255,255,0.7)',
                      fontFamily: "'Courier New', monospace",
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {doc.file_name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.25)',
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {doc.chunk_count} chunks // {(doc.file_size / 1024).toFixed(1)} KB
                      </span>
                      {doc.is_indexed && (
                        <span className="badge-success">INDEXED</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMut.mutate(doc.id) }}
                    className="game-btn-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Intelligence Interrogation Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="game-card" style={{ padding: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#8b5cf6',
                boxShadow: '0 0 6px #8b5cf6, 0 0 12px rgba(139,92,246,0.3)',
              }} />
              <h2 style={{
                fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                margin: 0, textTransform: 'uppercase', letterSpacing: 2,
                fontFamily: "'Courier New', monospace",
              }}>
                Intelligence Interrogation
              </h2>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="section-header" style={{ display: 'block', marginBottom: 8 }}>
                AI MODEL
              </label>
              <select
                className="game-input"
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="claude-opus">Claude Opus</option>
                <option value="claude-sonnet">Claude Sonnet</option>
                <option value="claude-haiku">Claude Haiku</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                QUERY INPUT
                {selectedDocs.length > 0 && (
                  <span style={{
                    fontSize: 10, color: '#00f0ff', fontWeight: 400,
                    textTransform: 'none', letterSpacing: 0,
                  }}>
                    ({selectedDocs.length} files targeted)
                  </span>
                )}
              </label>
              <textarea
                rows={4}
                className="game-input"
                style={{ resize: 'none', fontFamily: "'Courier New', monospace" }}
                placeholder="Enter interrogation query..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            <button
              onClick={() => queryMut.mutate()}
              disabled={queryMut.isPending || !question.trim() || (docs as any[]).length === 0}
              className="game-btn"
              style={{
                width: '100%', padding: '12px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {queryMut.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  SEARCHING CHUNKS...
                </>
              ) : (
                <>
                  <Search size={13} />
                  EXECUTE QUERY
                </>
              )}
            </button>
          </div>

          {/* Answer - Terminal Output */}
          {answer && (
            <div className="game-card animate-fade-in" style={{ padding: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00ff88',
                  boxShadow: '0 0 6px #00ff88, 0 0 12px rgba(0,255,136,0.3)',
                }} />
                <h3 style={{
                  fontSize: 12, fontWeight: 700, color: '#00ff88',
                  margin: 0, textTransform: 'uppercase', letterSpacing: 2,
                  fontFamily: "'Courier New', monospace",
                }}>
                  Intelligence Report
                </h3>
              </div>

              <div className="terminal-output scanline">
                {answer.answer}
              </div>

              {answer.sources?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                    <p className="section-header" style={{ margin: 0 }}>
                      SOURCE INTELLIGENCE
                    </p>
                    <span className="badge-info">
                      {answer.sources.length} CHUNKS
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {answer.sources.map((src: any, i: number) => {
                      const confidence = 1 - src.similarity
                      return (
                        <div key={i} className="source-card">
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            flexWrap: 'wrap', marginBottom: 8,
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: '#00f0ff',
                              fontFamily: "'Courier New', monospace",
                              letterSpacing: 0.5,
                            }}>
                              [{String(i + 1).padStart(2, '0')}]
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                              fontFamily: "'Courier New', monospace",
                            }}>
                              {src.file_name}
                            </span>
                            {src.page > 0 && (
                              <span style={{
                                fontSize: 10, color: 'rgba(255,255,255,0.25)',
                                fontFamily: "'Courier New', monospace",
                              }}>
                                // PAGE {src.page}
                              </span>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: confidence > 0.7 ? '#00ff88' : confidence > 0.4 ? '#00f0ff' : '#8b5cf6',
                                fontFamily: "'Courier New', monospace",
                              }}>
                                {(confidence * 100).toFixed(0)}%
                              </span>
                              <div className="confidence-bar-bg">
                                <div
                                  className="confidence-bar-fill"
                                  style={{ width: `${confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <p style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: 11, color: 'rgba(255,255,255,0.35)',
                            lineHeight: 1.6, margin: 0,
                            display: '-webkit-box', WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {src.excerpt}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
