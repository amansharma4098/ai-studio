// GET /api/skills/my-skills — list user's custom skills
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM custom_skills WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results || []);
};
