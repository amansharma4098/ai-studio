// GET /api/agents/:id/threads — list threads for agent
// POST /api/agents/:id/threads — create thread
import { Env, uuid, json, options, DEFAULT_USER } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM chat_threads WHERE agent_id = ? AND user_id = ? ORDER BY updated_at DESC'
  ).bind(params.id, DEFAULT_USER).all();
  return json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env }) => {
  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO chat_threads (id, agent_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, params.id, DEFAULT_USER, 'New Chat', now, now).run();

  const thread = await env.DB.prepare('SELECT * FROM chat_threads WHERE id = ?').bind(id).first();
  return json(thread, 201);
};
