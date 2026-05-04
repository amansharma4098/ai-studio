// POST /api/agent-builder/generate — use AI to generate agent config from description
import { Env, json, error, options } from '../_helpers';

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
        system: `You are an AI agent configuration generator. Given a description, generate a JSON agent config.
Return ONLY valid JSON with these fields:
{
  "name": "Agent Name",
  "description": "What this agent does",
  "system_prompt": "Detailed system prompt for the agent",
  "model_name": "anthropic/claude-sonnet",
  "temperature": 0.7,
  "max_tokens": 4096,
  "icon": "emoji icon",
  "suggested_skills": ["skill_name_1", "skill_name_2"]
}
Choose appropriate skills from: web_scraping, sql_query, email, slack, rest_api, data_analysis, azure, entra, devops, jira, servicenow, mongo_query.
Return ONLY the JSON, no markdown fences.`,
        messages: [{ role: 'user', content: description }],
      }),
    });

    const data = (await res.json()) as any;
    const text = data.content?.[0]?.text || '{}';

    try {
      const config = JSON.parse(text);
      return json(config);
    } catch {
      return json({
        name: 'Custom Agent',
        description: description,
        system_prompt: text,
        model_name: 'anthropic/claude-sonnet',
        temperature: 0.7,
        max_tokens: 4096,
        icon: '🤖',
        suggested_skills: [],
      });
    }
  } catch (err: any) {
    return error(err.message || 'Failed to generate agent config', 500);
  }
};
