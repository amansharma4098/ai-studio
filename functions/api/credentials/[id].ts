// PUT /api/credentials/:id — update credential
// DELETE /api/credentials/:id — delete credential
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  for (const key of ['name', 'auth_type', 'auth_category', 'description']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (body.credential_values !== undefined) {
    fields.push('credential_values = ?');
    values.push(JSON.stringify(body.credential_values));
  }
  if (body.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(params.id);

  await env.DB.prepare(`UPDATE credentials SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  const cred = await env.DB.prepare(
    'SELECT id, name, auth_type, auth_category, description, is_active, created_at, updated_at FROM credentials WHERE id = ?'
  ).bind(params.id).first();
  return json(cred);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM credentials WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
