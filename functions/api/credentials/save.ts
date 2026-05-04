// POST /api/credentials/save — save a new credential
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;

  if (!body.name) return error('name is required');
  if (!body.auth_type) return error('auth_type is required');
  if (!body.auth_category) return error('auth_category is required');

  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO credentials (id, user_id, name, auth_type, auth_category, description, credential_values, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    body.name, body.auth_type, body.auth_category,
    body.description || '',
    JSON.stringify(body.credential_values || {}),
    1, now, now
  ).run();

  const cred = await env.DB.prepare(
    'SELECT id, name, auth_type, auth_category, description, is_active, created_at, updated_at FROM credentials WHERE id = ?'
  ).bind(id).first();
  return json(cred, 201);
};
