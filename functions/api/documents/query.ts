// POST /api/documents/query — query documents with AI
import { Env, json, error, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const { question } = body;
  if (!question) return error('question is required');

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
        max_tokens: 4096,
        system: 'You are a document analysis assistant. Answer questions about documents clearly and accurately.',
        messages: [{ role: 'user', content: question }],
      }),
    });

    const data = (await res.json()) as any;
    return json({
      answer: data.content?.[0]?.text || 'No response',
      sources: [],
    });
  } catch (err: any) {
    return error(err.message || 'Query failed', 500);
  }
};
