// GET /api/monitoring/runs — list agent runs
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const { results } = await env.DB.prepare(
    `SELECT r.*, a.name as agent_name
     FROM agent_runs r
     LEFT JOIN agents a ON r.agent_id = a.id
     ORDER BY r.created_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return json(results || []);
};
