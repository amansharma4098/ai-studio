// POST /api/public/:slug/chat — chat with a deployed agent (no auth)
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  const message = body.message || '';
  const sessionId = body.session_id || uuid();

  if (!message) return error('message is required');

  // Find deployment + agent
  const dep = await env.DB.prepare(
    `SELECT d.*, a.system_prompt, a.model_name, a.temperature, a.max_tokens
     FROM agent_deployments d
     JOIN agents a ON d.agent_id = a.id
     WHERE d.slug = ? AND d.is_active = 1`
  ).bind(params.slug).first() as any;

  if (!dep) return error('Agent not found or not deployed', 404);

  // Find or create conversation
  let conv = await env.DB.prepare(
    'SELECT id FROM deployment_conversations WHERE deployment_id = ? AND session_id = ?'
  ).bind(dep.id, sessionId).first() as any;

  if (!conv) {
    const convId = uuid();
    await env.DB.prepare(
      'INSERT INTO deployment_conversations (id, deployment_id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(convId, dep.id, sessionId, new Date().toISOString(), new Date().toISOString()).run();
    conv = { id: convId };
  }

  // Save user message
  await env.DB.prepare(
    'INSERT INTO deployment_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(uuid(), conv.id, 'user', message, new Date().toISOString()).run();

  // Get history
  const { results: history } = await env.DB.prepare(
    'SELECT role, content FROM deployment_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 50'
  ).bind(conv.id).all();

  const messages = (history || []).map((m: any) => ({ role: m.role, content: m.content }));

  // Call AI
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return error('API not configured', 500);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: dep.max_tokens || 4096,
        system: dep.system_prompt || 'You are a helpful assistant.',
        messages,
        temperature: dep.temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as any;
    const reply = data.content?.[0]?.text || 'No response';

    // Save assistant message
    await env.DB.prepare(
      'INSERT INTO deployment_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(uuid(), conv.id, 'assistant', reply, new Date().toISOString()).run();

    // Update counters
    await env.DB.prepare(
      'UPDATE agent_deployments SET total_messages = total_messages + 2, updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), dep.id).run();

    return json({ response: reply, session_id: sessionId });
  } catch (err: any) {
    return error(err.message || 'Chat failed', 500);
  }
};
