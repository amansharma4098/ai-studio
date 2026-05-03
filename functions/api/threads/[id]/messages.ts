// GET /api/threads/:id/messages — get messages for a thread
import { Env, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).bind(params.id).all();
  return json(results);
};
