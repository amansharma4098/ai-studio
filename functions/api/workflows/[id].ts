// DELETE /api/workflows/:id — delete workflow
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM workflow_runs WHERE workflow_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM workflows WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
