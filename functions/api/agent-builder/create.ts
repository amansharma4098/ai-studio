// POST /api/agent-builder/create — auto-create agent from description using AI
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const description = body.description || '';
  if (!description) return error('Description is required');

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
        max_tokens: 2048,
        system: `You are an AI agent configuration generator. Given a description, generate a JSON config.
Return ONLY valid JSON:
{
  "name": "Agent Name",
  "description": "What this agent does",
  "system_prompt": "Detailed system prompt",
  "model_name": "anthropic/claude-sonnet",
  "temperature": 0.7,
  "max_tokens": 4096
}
Return ONLY the JSON, no markdown fences.`,
        messages: [{ role: 'user', content: description }],
      }),
    });

    const data = (await res.json()) as any;
    const text = data.content?.[0]?.text || '{}';
    let config: any;
    try {
      config = JSON.parse(text);
    } catch {
      config = {
        name: 'Custom Agent',
        description: description,
        system_prompt: `You are a helpful assistant. ${description}`,
        model_name: 'anthropic/claude-sonnet',
        temperature: 0.7,
        max_tokens: 4096,
      };
    }

    const id = uuid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO agents (id, user_id, name, description, system_prompt, model_name, temperature, max_tokens, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, DEFAULT_USER,
      config.name || 'Custom Agent',
      config.description || description,
      config.system_prompt || 'You are a helpful assistant.',
      config.model_name || 'anthropic/claude-sonnet',
      config.temperature ?? 0.7,
      config.max_tokens ?? 4096,
      now, now
    ).run();

    return json({ agent_id: id, ...config });
  } catch (err: any) {
    return error(err.message || 'Failed to create agent', 500);
  }
};
