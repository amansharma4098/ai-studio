// POST /api/threads/:id/chat — send message and get AI response
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const threadId = params.id as string;
  const body = (await request.json()) as any;
  const userMessage = body.input_text || body.message || '';

  if (!userMessage) return error('Message is required');

  // Get thread + agent info
  const thread = await env.DB.prepare('SELECT * FROM chat_threads WHERE id = ?').bind(threadId).first() as any;
  if (!thread) return error('Thread not found', 404);

  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(thread.agent_id).first() as any;
  if (!agent) return error('Agent not found', 404);

  // Save user message
  const userMsgId = uuid();
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO chat_messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(userMsgId, threadId, 'user', userMessage, now).run();

  // Get conversation history
  const { results: history } = await env.DB.prepare(
    'SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT 50'
  ).bind(threadId).all();

  const messages = (history || []).map((m: any) => ({ role: m.role, content: m.content }));

  // Call Anthropic
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return error('ANTHROPIC_API_KEY not configured', 500);

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
        max_tokens: agent.max_tokens || 4096,
        system: agent.system_prompt || 'You are a helpful assistant.',
        messages,
        temperature: agent.temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as any;
    const assistantText = data.content?.[0]?.text || 'No response';

    // Save assistant message
    const assistantMsgId = uuid();
    await env.DB.prepare(
      'INSERT INTO chat_messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(assistantMsgId, threadId, 'assistant', assistantText, new Date().toISOString()).run();

    // Update thread timestamp
    await env.DB.prepare(
      'UPDATE chat_threads SET updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), threadId).run();

    // Log run
    const runId = uuid();
    await env.DB.prepare(
      `INSERT INTO agent_runs (id, agent_id, user_id, input_text, output_text, status, input_tokens, output_tokens, execution_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      runId, agent.id, 'default', userMessage, assistantText, 'completed',
      data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, 0, now
    ).run();

    return json({ response: assistantText, content: assistantText });
  } catch (err: any) {
    return error(err.message || 'Failed to get AI response', 500);
  }
};
