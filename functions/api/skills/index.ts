// GET /api/skills/ — list all skills (built-in + custom)
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM custom_skills WHERE user_id = ? OR is_public = 1 ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results || []);
};
