// GET /api/agents/:id — get agent
// PUT /api/agents/:id — update agent
// DELETE /api/agents/:id — delete agent
import { Env, CORS, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(params.id).first();
  if (!agent) return error('Agent not found', 404);
  return json(agent);
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  for (const key of ['name', 'description', 'system_prompt', 'model_name', 'temperature', 'max_tokens']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (body.memory_enabled !== undefined) {
    fields.push('memory_enabled = ?');
    values.push(body.memory_enabled ? 1 : 0);
  }
  if (body.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(params.id);

  await env.DB.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(params.id).first();
  return json(agent);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM agents WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
