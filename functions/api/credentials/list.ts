// GET /api/credentials/list — list credentials
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, name, auth_type, auth_category, description, is_active, created_at, updated_at FROM credentials WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results);
};
