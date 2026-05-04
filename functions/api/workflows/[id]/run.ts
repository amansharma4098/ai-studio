// POST /api/workflows/:id/run — run a workflow
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const workflow = await env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(params.id).first() as any;
  if (!workflow) return error('Workflow not found', 404);

  const runId = uuid();
  const now = new Date().toISOString();
  const startTime = Date.now();

  // Parse definition and simulate execution
  let definition: any = {};
  try { definition = JSON.parse(workflow.definition || '{}'); } catch {}

  const nodeCount = definition.nodes?.length || 0;
  const execTime = Date.now() - startTime;

  await env.DB.prepare(
    `INSERT INTO workflow_runs (id, workflow_id, status, execution_trace, execution_time_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    runId, params.id, 'completed',
    JSON.stringify([{ step: 'start', message: `Workflow started with ${nodeCount} nodes` }, { step: 'end', message: 'Workflow completed' }]),
    execTime, now
  ).run();

  await env.DB.prepare('UPDATE workflows SET last_run_at = ? WHERE id = ?').bind(now, params.id).run();

  return json({ run_id: runId, status: 'completed', execution_time_ms: execTime });
};
