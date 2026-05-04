// GET /api/agent-builder/templates — list agent templates
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM agent_templates ORDER BY use_count DESC, created_at DESC'
  ).all();

  if (results && results.length > 0) return json(results);

  // Return built-in templates if none in DB
  return json([
    {
      id: 'tpl-devops',
      name: 'DevOps Engineer',
      description: 'Monitors infrastructure, manages deployments, and troubleshoots CI/CD pipelines.',
      category: 'Engineering',
      icon: 'server',
      system_prompt: 'You are an expert DevOps engineer. You help with CI/CD pipelines, infrastructure monitoring, container orchestration, and cloud deployments. Provide specific, actionable commands and configurations.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.5,
      max_tokens: 4096,
      suggested_skills: '["azure", "devops", "rest_api"]',
      tags: '["devops", "ci/cd", "infrastructure"]',
      is_featured: 1,
      use_count: 0,
    },
    {
      id: 'tpl-analyst',
      name: 'Data Analyst',
      description: 'Analyzes datasets, generates insights, creates reports and visualizations.',
      category: 'Analytics',
      icon: 'bar-chart',
      system_prompt: 'You are an expert data analyst. You analyze data, identify trends and patterns, create statistical summaries, and provide actionable business insights. Present data clearly with structured formats.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.3,
      max_tokens: 4096,
      suggested_skills: '["sql_query", "data_analysis"]',
      tags: '["data", "analytics", "reporting"]',
      is_featured: 1,
      use_count: 0,
    },
    {
      id: 'tpl-security',
      name: 'Security Auditor',
      description: 'Reviews security configurations, identifies vulnerabilities, and recommends fixes.',
      category: 'Security',
      icon: 'shield',
      system_prompt: 'You are a cybersecurity expert. You audit security configurations, identify vulnerabilities, review access policies, and recommend security best practices. Always prioritize the principle of least privilege.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.3,
      max_tokens: 4096,
      suggested_skills: '["entra", "azure", "rest_api"]',
      tags: '["security", "audit", "compliance"]',
      is_featured: 1,
      use_count: 0,
    },
    {
      id: 'tpl-support',
      name: 'Support Agent',
      description: 'Handles customer support tickets, drafts responses, and escalates issues.',
      category: 'Support',
      icon: 'headphones',
      system_prompt: 'You are a customer support specialist. You help resolve customer issues with empathy and efficiency. Draft clear, helpful responses. Escalate complex issues appropriately. Track issue status and follow up.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.6,
      max_tokens: 4096,
      suggested_skills: '["email", "slack", "jira"]',
      tags: '["support", "customer-service", "ticketing"]',
      is_featured: 0,
      use_count: 0,
    },
    {
      id: 'tpl-researcher',
      name: 'Research Assistant',
      description: 'Researches topics, summarizes findings, and compiles structured reports.',
      category: 'Research',
      icon: 'search',
      system_prompt: 'You are a thorough research assistant. You investigate topics deeply, cross-reference information, summarize findings clearly, and compile structured reports with citations and key takeaways.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.5,
      max_tokens: 4096,
      suggested_skills: '["web_scraping", "rest_api"]',
      tags: '["research", "analysis", "reports"]',
      is_featured: 0,
      use_count: 0,
    },
    {
      id: 'tpl-finance',
      name: 'Finance Tracker',
      description: 'Monitors cloud spending, tracks budgets, and generates cost reports.',
      category: 'Finance',
      icon: 'dollar-sign',
      system_prompt: 'You are a financial analyst specializing in cloud cost management. You track spending across cloud services, identify cost anomalies, recommend optimization strategies, and generate budget reports.',
      model_name: 'anthropic/claude-sonnet',
      temperature: 0.3,
      max_tokens: 4096,
      suggested_skills: '["azure", "data_analysis", "slack"]',
      tags: '["finance", "cost", "budgets"]',
      is_featured: 0,
      use_count: 0,
    },
  ]);
};
