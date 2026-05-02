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
  { type: 'trigger',  label: 'Trigger',    icon: '\u26A1', color: '#00f0ff', desc: 'Schedule or event trigger' },
  { type: 'agent',    label: 'Agent Node', icon: '\uD83E\uDD16', color: '#8b5cf6', desc: 'Run an AI agent' },
  { type: 'skill',    label: 'Skill',      icon: '\u2699\uFE0F', color: '#00ff88', desc: 'Execute a skill directly' },
  { type: 'condition',label: 'Condition',  icon: '\uD83D\uDD00', color: '#f59e0b', desc: 'Branch on condition' },
  { type: 'output',   label: 'Output',     icon: '\uD83D\uDCE4', color: '#ff00aa', desc: 'Send result / notify' },
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
      background: '#1a1a2e',
      border: `1.5px solid ${meta.color}`,
      borderRadius: '10px',
      padding: '8px 12px',
      color: '#eef0f6',
      minWidth: '140px',
      boxShadow: `0 0 12px ${meta.color}40, inset 0 1px 0 ${meta.color}20`,
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
  { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#00f0ff', strokeWidth: 2 } },
  { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 1.5 } },
  { id: 'e2-4', source: 'n2', target: 'n4', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 1.5 } },
  { id: 'e3-5', source: 'n3', target: 'n5', style: { stroke: '#ff00aa', strokeWidth: 1.5 } },
  { id: 'e4-5', source: 'n4', target: 'n5', style: { stroke: '#ff00aa', strokeWidth: 1.5 } },
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
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#00f0ff', strokeWidth: 2 } }, eds)),
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
    <div className="animate-fade-in min-h-screen p-8" style={{ background: '#1c1d2b' }}>
      {/* Inline styles for gaming aesthetic */}
      <style jsx global>{`
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 8px #00f0ff40, 0 0 20px #00f0ff20; }
          50% { box-shadow: 0 0 16px #00f0ff80, 0 0 40px #00f0ff40; }
        }
        @keyframes runPulse {
          0%, 100% { box-shadow: 0 0 6px #00ff8840, 0 0 14px #00ff8820; }
          50% { box-shadow: 0 0 14px #00ff88a0, 0 0 30px #00ff8860, 0 0 50px #00ff8830; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .neon-text {
          color: #00f0ff;
          text-shadow: 0 0 8px #00f0ff60, 0 0 20px #00f0ff30;
        }
        .game-card {
          background: linear-gradient(145deg, #1a1a2e 0%, #16162a 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }
        .game-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00f0ff40, transparent);
        }
        .game-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #1c1d2b;
          background: linear-gradient(135deg, #00f0ff 0%, #00c4cc 100%);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          text-shadow: 0 1px 0 rgba(0,0,0,0.1);
        }
        .game-btn:hover {
          box-shadow: 0 0 20px #00f0ff60, 0 0 40px #00f0ff20;
          transform: translateY(-1px);
        }
        .game-btn-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .game-btn-secondary:hover {
          border-color: rgba(255,255,255,0.2);
          color: #eef0f6;
          background: rgba(255,255,255,0.03);
        }
        .game-btn-danger {
          padding: 6px;
          color: #8b92a8;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .game-btn-danger:hover {
          color: #ff00aa;
          background: rgba(255,0,170,0.1);
          box-shadow: 0 0 12px rgba(255,0,170,0.2);
        }
        .game-input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #1c1d2b;
          padding: 10px 14px;
          font-size: 13px;
          color: #eef0f6;
          outline: none;
          transition: all 0.2s ease;
        }
        .game-input:focus {
          border-color: #00f0ff;
          box-shadow: 0 0 0 2px #00f0ff20, 0 0 12px #00f0ff10;
        }
        .game-input::placeholder { color: #6b7394; }
        .game-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          padding: 20px;
        }
        .game-modal {
          width: 100%;
          max-width: 28rem;
          background: linear-gradient(145deg, #1a1a2e 0%, #14142a 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 0 60px rgba(0,240,255,0.08), 0 25px 50px rgba(0,0,0,0.5);
          position: relative;
          overflow: hidden;
        }
        .game-modal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #00f0ff, #8b5cf6, #ff00aa);
        }
        .badge-success {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #00ff88;
          background: rgba(0,255,136,0.1);
          border: 1px solid rgba(0,255,136,0.2);
        }
        .badge-info {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #f59e0b;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.2);
        }
        .run-btn-pulse {
          animation: runPulse 2s ease-in-out infinite;
        }
        .ability-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 11.5px;
          font-weight: 600;
          background: #1c1d2b;
          color: #eef0f6;
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .ability-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 8px;
          padding: 1px;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          -webkit-mask-composite: xor;
        }
        .ability-btn:hover {
          transform: translateY(-2px);
        }
        .react-flow__node {
          font-family: inherit !important;
        }
        .react-flow__attribution {
          display: none !important;
        }
      `}</style>

      {/* Header - Mission Planner Style */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#00f0ff',
              boxShadow: '0 0 8px #00f0ff80, 0 0 20px #00f0ff40',
            }} />
            <h1 className="neon-text text-2xl font-bold tracking-wide" style={{ fontFamily: 'inherit' }}>
              MISSION PLANNER
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: '#4a5568' }}>
            Visual drag-and-drop workflow builder powered by React Flow + Celery
          </p>
        </div>
        <button onClick={() => setShowSave(true)} className="game-btn" style={{ animation: 'neonPulse 3s ease-in-out infinite' }}>
          <Save size={14} /> Save Workflow
        </button>
      </div>

      {/* Node Palette - Ability Selection */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, #00f0ff, #8b5cf6)',
          }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#8b92a8' }}>
            Deploy Abilities
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {NODE_PALETTE.map(n => (
            <button key={n.type} onClick={() => addNode(n.type)}
              className="ability-btn"
              style={{
                border: `1px solid ${n.color}50`,
                boxShadow: `0 0 8px ${n.color}15`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${n.color}40, inset 0 0 20px ${n.color}08`
                ;(e.currentTarget as HTMLElement).style.borderColor = `${n.color}90`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${n.color}15`
                ;(e.currentTarget as HTMLElement).style.borderColor = `${n.color}50`
              }}
            >
              <span style={{ fontSize: '14px' }}>{n.icon}</span>
              <span style={{ color: n.color }}>{n.label}</span>
              <span className="text-[9px] font-normal" style={{ color: '#4a5568' }}>{n.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* React Flow Canvas - Tactical Map */}
      <div className="game-card mb-5" style={{ height: '420px', borderColor: 'rgba(0,240,255,0.1)' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ background: '#0d0d16' }}
        >
          <Background color="#1e1e3a" gap={20} size={1} />
          <Controls style={{
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }} />
          <MiniMap style={{
            background: '#1c1d2b',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
          }} nodeColor={(node) => {
            const nodeId = node.id;
            const paletteItem = NODE_PALETTE.find(n => {
              const found = STARTER_NODES.find(sn => sn.id === nodeId);
              return found ? (found.style.border as string).includes(n.color) : false;
            });
            return paletteItem ? paletteItem.color : '#00f0ff';
          }} />
        </ReactFlow>
      </div>

      {/* Saved Workflows - Mission Profiles */}
      <div className="game-card">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 3, height: 14, borderRadius: 2,
              background: 'linear-gradient(180deg, #8b5cf6, #ff00aa)',
            }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#eef0f6' }}>
              Saved Mission Profiles
            </h2>
          </div>
          <span className="text-xs font-mono" style={{ color: '#4a5568' }}>
            [{(workflows as any[]).length}] profiles loaded
          </span>
        </div>
        <div>
          {(workflows as any[]).length === 0 && (
            <div className="py-14 text-center text-sm" style={{ color: '#4a5568' }}>
              <div className="mb-2 text-2xl" style={{ opacity: 0.4 }}>
                {'\u2694\uFE0F'}
              </div>
              No mission profiles saved yet -- design one above and click Save
            </div>
          )}
          {(workflows as any[]).map((wf: any) => (
            <div key={wf.id}
              className="flex items-center gap-3 px-5 py-4 transition-all duration-200"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Status indicator dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: wf.is_active ? '#00ff88' : '#ef4444',
                boxShadow: wf.is_active ? '0 0 8px #00ff8880' : '0 0 8px #ef444480',
              }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: '#eef0f6' }}>{wf.name}</span>
                  {wf.schedule_cron && (
                    <span className="badge-info">
                      {wf.schedule_cron}
                    </span>
                  )}
                  <span className={wf.is_active ? 'badge-success' : ''}
                    style={!wf.is_active ? {
                      display: 'inline-flex', alignItems: 'center', borderRadius: '9999px',
                      padding: '2px 10px', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                      color: '#ef4444', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    } : {}}>
                    {wf.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: '#4a5568' }}>
                  {wf.description || 'No description'} // Created {new Date(wf.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => runMut.mutate(wf.id)}
                disabled={runMut.isPending}
                className={activeWf === wf.id ? '' : 'run-btn-pulse'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  borderRadius: '8px', padding: '6px 14px',
                  fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ...(activeWf === wf.id
                    ? {
                        color: '#00ff88',
                        background: 'rgba(0,255,136,0.1)',
                        border: '1px solid rgba(0,255,136,0.3)',
                      }
                    : {
                        color: '#1c1d2b',
                        background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                        border: 'none',
                      }
                  ),
                }}
              >
                {runMut.isPending && activeWf === wf.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {activeWf === wf.id ? 'Queued!' : 'Run Now'}
              </button>
              <button onClick={() => deleteMut.mutate(wf.id)} className="game-btn-danger">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Modal - Mission Config */}
      {showSave && (
        <div className="game-modal-overlay" onClick={() => setShowSave(false)}>
          <div className="game-modal animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#00f0ff',
                  boxShadow: '0 0 8px #00f0ff80',
                }} />
                <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: '#eef0f6' }}>
                  Save Mission
                </h2>
              </div>
              <button onClick={() => setShowSave(false)}
                className="text-lg transition-colors duration-200"
                style={{ color: '#4a5568', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff00aa' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4a5568' }}
              >
                {'\u2715'}
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#8b92a8' }}>
                  Mission Designation
                </label>
                <input className="game-input"
                  value={wfName} onChange={e => setWfName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: '#8b92a8' }}>
                  Cron Schedule <span className="font-normal normal-case" style={{ color: '#4a5568' }}>(leave empty for manual trigger)</span>
                </label>
                <input className="game-input"
                  placeholder="0 9 * * 1-5" value={cron} onChange={e => setCron(e.target.value)}
                  style={{ fontFamily: 'monospace' }} />
                <p className="mt-1.5 text-[10.5px]" style={{ color: '#4a5568' }}>
                  Examples: <code style={{ color: '#00f0ff', background: 'rgba(0,240,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>0 9 * * *</code> = daily 9am {' // '}
                  <code style={{ color: '#00f0ff', background: 'rgba(0,240,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>0 9 * * 1-5</code> = weekdays
                </p>
              </div>
              <div style={{
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,240,255,0.03)',
                padding: '12px 14px',
                fontSize: '11px',
                color: '#8b92a8',
                display: 'flex',
                gap: '16px',
              }}>
                <span>Nodes: <strong style={{ color: '#00f0ff' }}>{nodes.length}</strong></span>
                <span>Edges: <strong style={{ color: '#8b5cf6' }}>{edges.length}</strong></span>
                <span style={{ marginLeft: 'auto', color: '#4a5568' }}>Ready for deployment</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowSave(false)} className="game-btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '10px 16px' }}>
                  Cancel
                </button>
                <button onClick={saveWorkflow} disabled={createMut.isPending}
                  className="game-btn"
                  style={{
                    flex: 1, justifyContent: 'center', padding: '10px 16px',
                    opacity: createMut.isPending ? 0.6 : 1,
                  }}>
                  {createMut.isPending ? <><Loader2 size={13} className="animate-spin" />Deploying...</> : <><Save size={13} />Deploy Mission</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
