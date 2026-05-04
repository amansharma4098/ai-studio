// POST /api/skills/:id/install — install a public skill
import { Env, uuid, json, error, options, DEFAULT_USER } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const skill = await env.DB.prepare('SELECT * FROM custom_skills WHERE id = ?').bind(params.id).first() as any;
  if (!skill) return error('Skill not found', 404);

  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO custom_skills (id, user_id, skill_name, skill_type, description, icon, config_json, is_custom, is_public, version, source_skill_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    skill.skill_name, skill.skill_type,
    skill.description, skill.icon,
    skill.config_json, 1, 0,
    skill.version, params.id,
    now, now
  ).run();

  // Increment install count
  await env.DB.prepare('UPDATE custom_skills SET install_count = install_count + 1 WHERE id = ?').bind(params.id).run();

  const installed = await env.DB.prepare('SELECT * FROM custom_skills WHERE id = ?').bind(id).first();
  return json(installed, 201);
};
