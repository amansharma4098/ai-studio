// DELETE /api/documents/:id — delete document
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
