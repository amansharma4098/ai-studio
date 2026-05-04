// POST /api/playground/run — run a prompt against a model
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const { prompt, system_prompt, model_name, temperature, max_tokens } = body;

  if (!prompt) return error('Prompt is required');

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
        max_tokens: max_tokens || 4096,
        system: system_prompt || 'You are a helpful assistant.',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      return error(data.error?.message || 'API error', res.status);
    }

    return json({
      response: data.content?.[0]?.text || 'No response',
      usage: data.usage || {},
      model: data.model || model_name,
    });
  } catch (err: any) {
    return error(err.message || 'Failed to run prompt', 500);
  }
};
