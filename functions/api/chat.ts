interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: CORS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured. Add it in Cloudflare Pages > Settings > Environment variables.' },
      { status: 500, headers: CORS }
    );
  }

  try {
    const { system_prompt, messages, model, temperature, max_tokens } =
      (await context.request.json()) as any;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: max_tokens || 4096,
        system: system_prompt || 'You are a helpful assistant.',
        messages: messages || [],
        temperature: temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      return Response.json(
        { error: data.error?.message || 'Anthropic API error' },
        { status: res.status, headers: CORS }
      );
    }

    return Response.json(
      { response: data.content?.[0]?.text || 'No response' },
      { headers: CORS }
    );
  } catch (err: any) {
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500, headers: CORS }
    );
  }
};
