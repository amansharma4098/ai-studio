// GET /api/agents/:id/skills — list skill bindings
// POST /api/agents/:id/skills — add skill binding
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM agent_skill_bindings WHERE agent_id = ? ORDER BY created_at DESC'
  ).bind(params.id).all();
  return json(results || []);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const { skill_id, skill_name, skill_type, config_json, credential_id } = body;

  if (!skill_name) return error('skill_name is required');

  const id = uuid();
  await env.DB.prepare(
    `INSERT INTO agent_skill_bindings (id, agent_id, skill_id, skill_name, skill_type, config_json, credential_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, params.id,
    skill_id || id, skill_name,
    skill_type || 'built-in',
    config_json || '{}',
    credential_id || null,
    new Date().toISOString()
  ).run();

  const binding = await env.DB.prepare('SELECT * FROM agent_skill_bindings WHERE id = ?').bind(id).first();
  return json(binding, 201);
};
