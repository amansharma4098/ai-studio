// POST /api/agents/:id/run — run an agent with input
import { Env, uuid, json, error, options, DEFAULT_USER } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const agentId = params.id as string;
  const body = (await request.json()) as any;
  const inputText = body.input_text || '';
  if (!inputText) return error('input_text is required');

  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first() as any;
  if (!agent) return error('Agent not found', 404);

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return error('ANTHROPIC_API_KEY not configured', 500);

  const startTime = Date.now();
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
        messages: [{ role: 'user', content: inputText }],
        temperature: agent.temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as any;
    const outputText = data.content?.[0]?.text || 'No response';
    const execTime = Date.now() - startTime;

    const runId = uuid();
    await env.DB.prepare(
      `INSERT INTO agent_runs (id, agent_id, user_id, input_text, output_text, status, input_tokens, output_tokens, execution_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      runId, agentId, DEFAULT_USER, inputText, outputText, 'completed',
      data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, execTime,
      new Date().toISOString()
    ).run();

    return json({ run_id: runId, output: outputText, execution_time_ms: execTime, usage: data.usage });
  } catch (err: any) {
    const execTime = Date.now() - startTime;
    const runId = uuid();
    await env.DB.prepare(
      `INSERT INTO agent_runs (id, agent_id, user_id, input_text, status, error_message, execution_time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(runId, agentId, DEFAULT_USER, inputText, 'failed', err.message, execTime, new Date().toISOString()).run();

    return error(err.message || 'Agent run failed', 500);
  }
};
