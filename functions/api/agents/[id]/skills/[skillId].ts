// DELETE /api/agents/:id/skills/:skillId — remove skill binding
import { Env, json, error, options } from '../../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare(
    'DELETE FROM agent_skill_bindings WHERE id = ? AND agent_id = ?'
  ).bind(params.skillId, params.id).run();
  return json({ ok: true });
};
