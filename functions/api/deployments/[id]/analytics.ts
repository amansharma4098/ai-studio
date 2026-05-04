// GET /api/deployments/:id/analytics — deployment analytics
import { Env, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const dep = await env.DB.prepare('SELECT * FROM agent_deployments WHERE id = ?').bind(params.id).first() as any;
  if (!dep) return error('Deployment not found', 404);

  const conversations = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM deployment_conversations WHERE deployment_id = ?'
  ).bind(params.id).first() as any;

  const messages = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM deployment_messages
     WHERE conversation_id IN (SELECT id FROM deployment_conversations WHERE deployment_id = ?)`
  ).bind(params.id).first() as any;

  return json({
    deployment_id: params.id,
    total_conversations: conversations?.count || 0,
    total_messages: messages?.count || 0,
    is_active: dep.is_active,
    created_at: dep.created_at,
  });
};
