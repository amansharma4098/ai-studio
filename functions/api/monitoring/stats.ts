// GET /api/monitoring/stats — dashboard stats
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const total = await env.DB.prepare('SELECT COUNT(*) as count FROM agent_runs').first() as any;
  const completed = await env.DB.prepare("SELECT COUNT(*) as count FROM agent_runs WHERE status = 'completed'").first() as any;
  const failed = await env.DB.prepare("SELECT COUNT(*) as count FROM agent_runs WHERE status = 'failed'").first() as any;

  const totalRuns = total?.count || 0;
  const successRate = totalRuns > 0 ? Math.round((completed?.count || 0) / totalRuns * 100) : 100;

  return json({
    total_runs: totalRuns,
    completed_runs: completed?.count || 0,
    failed_runs: failed?.count || 0,
    success_rate: successRate,
  });
};
