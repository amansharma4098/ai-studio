'use client'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactFlow, {
  addEdge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Connection, Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, Play, Trash2, Save, Loader2 } from 'lucide-react'
import { workflowsApi } from '@/lib/api'

// ── Custom Node Components ────────────────────────────────────────
const nodeTypes = {}

const NODE_PALETTE = [
  { type: 'trigger',  label: 'Trigger',    icon: '⚡', color: '#10b981', desc: 'Schedule or event trigger' },
  { type: 'agent',    label: 'Agent Node', icon: '🤖', color: '#1e293b', desc: 'Run an AI agent' },
  { type: 'skill',    label: 'Skill',      icon: '⚙️', color: '#0089d6', desc: 'Execute a skill directly' },
  { type: 'condition',label: 'Condition',  icon: '🔀', color: '#f59e0b', desc: 'Branch on condition' },
  { type: 'output',   label: 'Output',     icon: '📤', color: '#ef4444', desc: 'Send result / notify' },
]

const makeNode = (type: string, position: { x: number; y: number }, id: string) => {
  const meta = NODE_PALETTE.find(n => n.type === type)!
  return {
    id,
    type: 'default',
    position,
    data: {
      label: (
        <div className="flex items-center gap-2 px-1">
          <span>{meta.icon}</span>
          <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
      ),
    },
    style: {
      background: '#ffffff',
      border: `1.5px solid ${meta.color}40`,
      borderRadius: '10px',
      padding: '8px 12px',
      color: '#1e293b',
      minWidth: '140px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
  }
}

const STARTER_NODES = [
  makeNode('trigger', { x: 80, y: 180 }, 'n1'),
  makeNode('agent', { x: 280, y: 180 }, 'n2'),
  makeNode('skill', { x: 480, y: 80 }, 'n3'),
  makeNode('skill', { x: 480, y: 280 }, 'n4'),
  makeNode('output', { x: 680, y: 180 }, 'n5'),
]

const STARTER_EDGES: Edge[] = [
  { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#0089d6', strokeWidth: 1.5 } },
  { id: 'e2-4', source: 'n2', target: 'n4', animated: true, style: { stroke: '#0089d6', strokeWidth: 1.5 } },
  { id: 'e3-5', source: 'n3', target: 'n5', style: { stroke: '#ef4444', strokeWidth: 1.5 } },
  { id: 'e4-5', source: 'n4', target: 'n5', style: { stroke: '#ef4444', strokeWidth: 1.5 } },
]

export default function WorkflowsPage() {
  const qc = useQueryClient()
  const [nodes, setNodes, onNodesChange] = useNodesState(STARTER_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(STARTER_EDGES)
  const [nodeCounter, setNodeCounter] = useState(6)
  const [wfName, setWfName] = useState('Azure Daily Report')
  const [cron, setCron] = useState('0 9 * * 1-5')
  const [showSave, setShowSave] = useState(false)
  const [activeWf, setActiveWf] = useState<string | null>(null)

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: any) => workflowsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); setShowSave(false) },
  })

  const runMut = useMutation({
    mutationFn: (id: string) => workflowsApi.run(id),
    onSuccess: (_, id) => setActiveWf(id),
    onSettled: () => setTimeout(() => setActiveWf(null), 3000),
  })

  const deleteMut = useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  })

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    [setEdges]
  )

  const addNode = (type: string) => {
    const id = `n${nodeCounter}`
    setNodeCounter(c => c + 1)
    setNodes(ns => [...ns, makeNode(type, { x: 100 + Math.random() * 400, y: 100 + Math.random() * 200 }, id)])
  }

  const saveWorkflow = () => {
    createMut.mutate({
      name: wfName,
      definition: { nodes: nodes.map(n => ({ id: n.id, type: 'agent_node', data: n.data })), edges },
      schedule_cron: cron || null,
    })
  }

  return (
    <div className="p-8">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow Builder</h1>
          <p className="mt-1 text-sm text-slate-500">Visual drag-and-drop workflow builder powered by React Flow + Celery</p>
        </div>
        <button onClick={() => setShowSave(true)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
          <Save size={14} /> Save Workflow
        </button>
      </div>

      {/* Node palette */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="self-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Add Node:</span>
        {NODE_PALETTE.map(n => (
          <button key={n.type} onClick={() => addNode(n.type)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50"
            style={{ borderLeftColor: n.color, borderLeftWidth: '3px' }}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>

      {/* React Flow canvas */}
      <div className="mb-5 rounded-xl border border-slate-200 overflow-hidden" style={{ height: '420px' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ background: '#f8fafc' }}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
          <MiniMap style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }} nodeColor={() => '#10b981'} />
        </ReactFlow>
      </div>

      {/* Saved Workflows */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Saved Workflows</h2>
          <span className="text-xs text-slate-400">{(workflows as any[]).length} workflows</span>
        </div>
        <div className="divide-y divide-slate-100">
          {(workflows as any[]).length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">No workflows saved yet — design one above and click Save</div>
          )}
          {(workflows as any[]).map((wf: any) => (
            <div key={wf.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{wf.name}</span>
                  {wf.schedule_cron && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      {wf.schedule_cron}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${wf.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {wf.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {wf.description || 'No description'} · Created {new Date(wf.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => runMut.mutate(wf.id)}
                disabled={runMut.isPending}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${activeWf === wf.id ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
              >
                {runMut.isPending && activeWf === wf.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {activeWf === wf.id ? 'Queued!' : 'Run Now'}
              </button>
              <button onClick={() => deleteMut.mutate(wf.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Modal */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={() => setShowSave(false)}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-800">Save Workflow</h2>
              <button onClick={() => setShowSave(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Workflow Name</label>
                <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={wfName} onChange={e => setWfName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Cron Schedule <span className="font-normal normal-case">(leave empty for manual trigger)</span>
                </label>
                <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0 9 * * 1-5" value={cron} onChange={e => setCron(e.target.value)} />
                <p className="mt-1 text-[10.5px] text-slate-400">Examples: <code>0 9 * * *</code> = daily 9am · <code>0 9 * * 1-5</code> = weekdays</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                Nodes: <strong className="text-slate-800">{nodes.length}</strong> · Edges: <strong className="text-slate-800">{edges.length}</strong>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSave(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={saveWorkflow} disabled={createMut.isPending}
                  className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {createMut.isPending ? <><Loader2 size={13} className="animate-spin" />Saving...</> : <><Save size={13} />Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
