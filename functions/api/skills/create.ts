// POST /api/skills/create — create a custom skill
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  if (!body.skill_name) return error('skill_name is required');
  if (!body.skill_type) return error('skill_type is required');

  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO custom_skills (id, user_id, skill_name, skill_type, description, icon, config_json, is_custom, is_public, version, test_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    body.skill_name, body.skill_type,
    body.description || '', body.icon || '⚡',
    JSON.stringify(body.config_json || {}),
    1, body.is_public ? 1 : 0,
    body.version || '1.0.0',
    body.test_payload || null,
    now, now
  ).run();

  const skill = await env.DB.prepare('SELECT * FROM custom_skills WHERE id = ?').bind(id).first();
  return json(skill, 201);
};
