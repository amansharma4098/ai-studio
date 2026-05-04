// GET /api/documents/ — list documents
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results || []);
};
