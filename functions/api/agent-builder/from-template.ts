// POST /api/agent-builder/from-template — create agent from a template
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const templateId = url.searchParams.get('template_id');
  if (!templateId) return error('template_id is required');

  // Try DB first
  let tpl = await env.DB.prepare('SELECT * FROM agent_templates WHERE id = ?').bind(templateId).first() as any;

  // Fallback to built-in templates
  if (!tpl) {
    const builtIn: Record<string, any> = {
      'tpl-devops': { name: 'DevOps Engineer', description: 'Monitors infrastructure and manages deployments', system_prompt: 'You are an expert DevOps engineer. You help with CI/CD pipelines, infrastructure monitoring, container orchestration, and cloud deployments.', model_name: 'anthropic/claude-sonnet', temperature: 0.5 },
      'tpl-analyst': { name: 'Data Analyst', description: 'Analyzes datasets and generates insights', system_prompt: 'You are an expert data analyst. You analyze data, identify trends, and provide actionable business insights.', model_name: 'anthropic/claude-sonnet', temperature: 0.3 },
      'tpl-security': { name: 'Security Auditor', description: 'Reviews security configurations and identifies vulnerabilities', system_prompt: 'You are a cybersecurity expert. You audit security configurations and recommend best practices.', model_name: 'anthropic/claude-sonnet', temperature: 0.3 },
      'tpl-support': { name: 'Support Agent', description: 'Handles customer support tickets', system_prompt: 'You are a customer support specialist. Help resolve issues with empathy and efficiency.', model_name: 'anthropic/claude-sonnet', temperature: 0.6 },
      'tpl-researcher': { name: 'Research Assistant', description: 'Researches topics and compiles reports', system_prompt: 'You are a thorough research assistant. Investigate topics deeply and summarize findings clearly.', model_name: 'anthropic/claude-sonnet', temperature: 0.5 },
      'tpl-finance': { name: 'Finance Tracker', description: 'Monitors cloud spending and tracks budgets', system_prompt: 'You are a financial analyst specializing in cloud cost management.', model_name: 'anthropic/claude-sonnet', temperature: 0.3 },
    };
    tpl = builtIn[templateId];
    if (!tpl) return error('Template not found', 404);
  }

  const id = uuid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO agents (id, user_id, name, description, system_prompt, model_name, temperature, max_tokens, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, DEFAULT_USER,
    tpl.name, tpl.description || '',
    tpl.system_prompt, tpl.model_name || 'anthropic/claude-sonnet',
    tpl.temperature ?? 0.7, tpl.max_tokens ?? 4096,
    now, now
  ).run();

  // Increment use count if in DB
  await env.DB.prepare('UPDATE agent_templates SET use_count = use_count + 1 WHERE id = ?').bind(templateId).run();

  const agent = await env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(id).first();
  return json({ agent_id: id, agent });
};
