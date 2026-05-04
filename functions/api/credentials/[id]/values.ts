// GET /api/credentials/:id/values — get credential values (sensitive)
import { Env, json, error, options, DEFAULT_USER } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const cred = await env.DB.prepare(
    'SELECT * FROM credentials WHERE id = ? AND user_id = ?'
  ).bind(params.id, DEFAULT_USER).first() as any;

  if (!cred) return error('Credential not found', 404);

  let values = {};
  try { values = JSON.parse(cred.credential_values || '{}'); } catch {}

  // Mask sensitive values for display (show only last 4 chars)
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    const val = String(v);
    masked[k] = val.length > 8 ? '•'.repeat(val.length - 4) + val.slice(-4) : '•'.repeat(val.length);
  }

  return json({ id: cred.id, name: cred.name, values: masked });
};
