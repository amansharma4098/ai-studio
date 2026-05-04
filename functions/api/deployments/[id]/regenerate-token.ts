// POST /api/deployments/:id/regenerate-token — regenerate deploy token
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const newToken = uuid();
  await env.DB.prepare(
    'UPDATE agent_deployments SET deploy_token = ?, updated_at = ? WHERE id = ?'
  ).bind(newToken, new Date().toISOString(), params.id).run();

  return json({ deploy_token: newToken });
};
