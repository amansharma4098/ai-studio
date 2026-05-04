// GET /api/public/:slug/history/:sessionId — get chat history for a session
import { Env, json, error, options } from '../../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const dep = await env.DB.prepare(
    'SELECT id FROM agent_deployments WHERE slug = ? AND is_active = 1'
  ).bind(params.slug).first() as any;

  if (!dep) return error('Agent not found', 404);

  const conv = await env.DB.prepare(
    'SELECT id FROM deployment_conversations WHERE deployment_id = ? AND session_id = ?'
  ).bind(dep.id, params.sessionId).first() as any;

  if (!conv) return json([]);

  const { results } = await env.DB.prepare(
    'SELECT role, content, created_at FROM deployment_messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).bind(conv.id).all();

  return json(results || []);
};
