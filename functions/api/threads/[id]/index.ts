// DELETE /api/threads/:id — delete a thread
import { Env, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare('DELETE FROM chat_messages WHERE thread_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM chat_threads WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
