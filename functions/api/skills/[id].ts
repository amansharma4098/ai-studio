// PUT /api/skills/:id — update skill
// DELETE /api/skills/:id — delete skill
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  for (const key of ['skill_name', 'skill_type', 'description', 'icon', 'version', 'test_payload']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (body.config_json !== undefined) {
    fields.push('config_json = ?');
    values.push(JSON.stringify(body.config_json));
  }
  if (body.is_public !== undefined) {
    fields.push('is_public = ?');
    values.push(body.is_public ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(params.id);

  await env.DB.prepare(`UPDATE custom_skills SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  const skill = await env.DB.prepare('SELECT * FROM custom_skills WHERE id = ?').bind(params.id).first();
  return json(skill);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM custom_skills WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
