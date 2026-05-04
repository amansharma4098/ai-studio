// GET /api/teams/:id — get team
// PUT /api/teams/:id — update team
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(params.id).first();
  if (!team) return error('Team not found', 404);
  return json(team);
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  for (const key of ['name', 'description', 'billing_email']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(params.id);

  await env.DB.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(params.id).first();
  return json(team);
};
