'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, FileText, Search, Loader2 } from 'lucide-react'
import { documentsApi } from '@/lib/api'

export default function DocumentsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [question, setQuestion] = useState('')
  const [model, setModel] = useState('claude-sonnet')
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Document AI</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload documents → LangChain chunks + embeds → ChromaDB → RAG query
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left: Upload + document list */}
        <div className="space-y-4">
          {/* Upload */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 transition-all hover:border-emerald-500 hover:bg-emerald-50/50"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.md,.docx,.csv" onChange={handleUpload} />
            {uploading
              ? <><Loader2 size={28} className="animate-spin text-emerald-500" /><p className="text-sm text-slate-500">Uploading and indexing...</p></>
              : <><Upload size={28} className="text-slate-400" /><p className="text-sm font-semibold text-slate-700">Click to upload document</p><p className="text-xs text-slate-400">PDF, TXT, MD, DOCX, CSV · Max 50MB</p></>
            }
          </div>

          {/* RAG pipeline visual */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">RAG Pipeline</p>
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              {['Upload', '→', 'Text Split', '→', 'Embeddings', '→', 'ChromaDB', '→', 'Similarity Search', '→', 'Claude', '→', 'Answer'].map((s, i) => (
                <span key={i} className={s === '→' ? 'text-slate-300' : 'rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700'}>{s}</span>
              ))}
            </div>
          </div>

          {/* Document list */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Indexed Documents</h2>
              <p className="text-[11px] text-slate-400">Select documents to scope your query</p>
            </div>
            <div className="divide-y divide-slate-100">
              {(docs as any[]).length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">No documents yet — upload one above</div>
              )}
              {(docs as any[]).map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${selectedDocs.includes(doc.id) ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}
                >
                  <FileText size={16} className={selectedDocs.includes(doc.id) ? 'text-emerald-500' : 'text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-700">{doc.file_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {doc.chunk_count} chunks · {(doc.file_size / 1024).toFixed(1)} KB
                      {doc.is_indexed && <span className="ml-2 text-emerald-600">indexed</span>}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMut.mutate(doc.id) }}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Query + Answer */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Ask Your Documents</h2>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Model</label>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                value={model} onChange={e => setModel(e.target.value)}>
                <option value="claude-opus">Claude Opus</option>
                <option value="claude-sonnet">Claude Sonnet</option>
                <option value="claude-haiku">Claude Haiku</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Question {selectedDocs.length > 0 && <span className="font-normal normal-case text-emerald-500">({selectedDocs.length} docs selected)</span>}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="What does this document say about..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            <button
              onClick={() => queryMut.mutate()}
              disabled={queryMut.isPending || !question.trim() || (docs as any[]).length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {queryMut.isPending ? <><Loader2 size={14} className="animate-spin" />Searching chunks...</> : <><Search size={13} />Query Documents</>}
            </button>
          </div>

          {/* Answer */}
          {answer && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-emerald-600">Answer</h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {answer.answer}
              </div>

              {answer.sources?.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sources ({answer.sources.length} chunks)</p>
                  <div className="space-y-2">
                    {answer.sources.map((src: any, i: number) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-700">{src.file_name}</span>
                          {src.page > 0 && <span className="text-[10px] text-slate-400">page {src.page}</span>}
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            {(1 - src.similarity).toFixed(2)} match
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{src.excerpt}</p>
                      </div>
                    ))}
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
