// GET /api/workflows/ — list workflows
// POST /api/workflows/ — create workflow
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM workflows WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results || []);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  if (!body.name) return error('name is required');

  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO workflows (id, user_id, name, description, definition, schedule_cron, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    body.name,
    body.description || '',
    JSON.stringify(body.definition || {}),
    body.schedule_cron || null,
    now
  ).run();

  const workflow = await env.DB.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first();
  return json(workflow, 201);
};
