// GET /api/audit/stats — audit statistics
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const total = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?'
  ).bind(DEFAULT_USER).first() as any;

  const byAction = await env.DB.prepare(
    'SELECT action, COUNT(*) as count FROM audit_logs WHERE user_id = ? GROUP BY action ORDER BY count DESC LIMIT 10'
  ).bind(DEFAULT_USER).all();

  const byResource = await env.DB.prepare(
    'SELECT resource_type, COUNT(*) as count FROM audit_logs WHERE user_id = ? GROUP BY resource_type ORDER BY count DESC LIMIT 10'
  ).bind(DEFAULT_USER).all();

  return json({
    total_events: total?.count || 0,
    by_action: byAction.results || [],
    by_resource: byResource.results || [],
  });
};
