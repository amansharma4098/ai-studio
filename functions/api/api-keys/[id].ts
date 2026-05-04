// DELETE /api/api-keys/:id — revoke API key
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
