// POST /api/agents/:id/deploy — deploy an agent
import { Env, uuid, json, error, options, DEFAULT_USER } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const agentId = params.id as string;
  const body = (await request.json()) as any;

  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first();
  if (!agent) return error('Agent not found', 404);

  const id = uuid();
  const slug = `${(agent as any).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${id.slice(0, 6)}`;
  const deployToken = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO agent_deployments (id, agent_id, user_id, slug, deploy_token, deploy_type, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, agentId, DEFAULT_USER, slug, deployToken,
    body.deploy_type || 'all',
    JSON.stringify(body.settings || {}),
    now, now
  ).run();

  const deployment = await env.DB.prepare('SELECT * FROM agent_deployments WHERE id = ?').bind(id).first();
  return json(deployment, 201);
};
