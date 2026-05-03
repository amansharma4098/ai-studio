// GET /api/agents/ — list agents
// POST /api/agents/ — create agent
import { Env, CORS, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(DEFAULT_USER).all();
  return json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO agents (id, user_id, name, description, system_prompt, model_name, temperature, max_tokens, memory_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    body.name || 'Untitled Agent',
    body.description || '',
    body.system_prompt || 'You are a helpful assistant.',
    body.model_name || 'anthropic/claude-sonnet',
    body.temperature ?? 0.7,
    body.max_tokens ?? 4096,
    body.memory_enabled ? 1 : 0,
    now, now
  ).run();

  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(id).first();
  return json(agent, 201);
};
