// GET /api/api-keys/ — list API keys
// POST /api/api-keys/ — create API key
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results || []);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  if (!body.name) return error('name is required');

  const id = uuid();
  const rawKey = `aist_${uuid().replace(/-/g, '')}`;
  const keyPrefix = rawKey.slice(0, 12) + '...';

  // Hash the key for storage
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const now = new Date().toISOString();
  let expiresAt = null;
  if (body.expires_days) {
    const d = new Date();
    d.setDate(d.getDate() + body.expires_days);
    expiresAt = d.toISOString();
  }

  await env.DB.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, scopes, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    body.name, keyPrefix, keyHash,
    JSON.stringify(body.scopes || []),
    expiresAt, now
  ).run();

  // Return the raw key only on creation (won't be shown again)
  return json({ id, name: body.name, key: rawKey, key_prefix: keyPrefix, expires_at: expiresAt }, 201);
};
