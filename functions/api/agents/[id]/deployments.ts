// GET /api/agents/:id/deployments — list deployments for an agent
import { Env, json, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM agent_deployments WHERE agent_id = ? ORDER BY created_at DESC'
  ).bind(params.id).all();
  return json(results || []);
};
