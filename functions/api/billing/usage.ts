// GET /api/billing/usage — get usage stats
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const runs = await env.DB.prepare(
    'SELECT COUNT(*) as count, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens FROM agent_runs WHERE user_id = ?'
  ).bind(DEFAULT_USER).first() as any;

  const agents = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM agents WHERE user_id = ?'
  ).bind(DEFAULT_USER).first() as any;

  return json({
    total_runs: runs?.count || 0,
    total_input_tokens: runs?.input_tokens || 0,
    total_output_tokens: runs?.output_tokens || 0,
    total_agents: agents?.count || 0,
    estimated_cost_usd: ((runs?.input_tokens || 0) * 0.000003 + (runs?.output_tokens || 0) * 0.000015).toFixed(4),
  });
};
