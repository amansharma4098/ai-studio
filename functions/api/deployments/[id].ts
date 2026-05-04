// GET /api/deployments/:id — get deployment
// PUT /api/deployments/:id — update deployment
// DELETE /api/deployments/:id — delete deployment
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const dep = await env.DB.prepare(
    `SELECT d.*, a.name as agent_name, a.system_prompt
     FROM agent_deployments d
     JOIN agents a ON d.agent_id = a.id
     WHERE d.id = ?`
  ).bind(params.id).first();
  if (!dep) return error('Deployment not found', 404);
  return json(dep);
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
  if (body.deploy_type !== undefined) { fields.push('deploy_type = ?'); values.push(body.deploy_type); }
  if (body.settings !== undefined) { fields.push('settings = ?'); values.push(JSON.stringify(body.settings)); }
  if (body.allowed_domains !== undefined) { fields.push('allowed_domains = ?'); values.push(JSON.stringify(body.allowed_domains)); }
  if (body.rate_limit_rpm !== undefined) { fields.push('rate_limit_rpm = ?'); values.push(body.rate_limit_rpm); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(params.id);

  await env.DB.prepare(`UPDATE agent_deployments SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  const dep = await env.DB.prepare('SELECT * FROM agent_deployments WHERE id = ?').bind(params.id).first();
  return json(dep);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM deployment_messages WHERE conversation_id IN (SELECT id FROM deployment_conversations WHERE deployment_id = ?)').bind(params.id).run();
  await env.DB.prepare('DELETE FROM deployment_conversations WHERE deployment_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM agent_deployments WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
