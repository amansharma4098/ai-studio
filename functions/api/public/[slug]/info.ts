// GET /api/public/:slug/info — get public agent info (no auth)
import { Env, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const dep = await env.DB.prepare(
    `SELECT d.id, d.slug, d.settings, d.deploy_type, a.name, a.description
     FROM agent_deployments d
     JOIN agents a ON d.agent_id = a.id
     WHERE d.slug = ? AND d.is_active = 1`
  ).bind(params.slug).first() as any;

  if (!dep) return error('Agent not found or not deployed', 404);

  let settings = {};
  try { settings = JSON.parse(dep.settings || '{}'); } catch {}

  return json({
    slug: dep.slug,
    name: dep.name,
    description: dep.description,
    settings,
    deploy_type: dep.deploy_type,
  });
};
