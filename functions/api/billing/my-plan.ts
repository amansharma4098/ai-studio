// GET /api/billing/my-plan — get user's current plan
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  // Check teams for plan info
  const team = await env.DB.prepare(
    'SELECT plan FROM teams WHERE owner_id = ? LIMIT 1'
  ).bind(DEFAULT_USER).first() as any;

  return json({
    plan_id: team?.plan || 'free',
    plan_name: team?.plan === 'pro' ? 'Pro' : team?.plan === 'enterprise' ? 'Enterprise' : 'Free',
    billing_cycle: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
};
