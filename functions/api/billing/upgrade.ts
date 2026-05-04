// POST /api/billing/upgrade — upgrade plan
import { Env, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const planId = body.plan_id;
  if (!planId) return error('plan_id is required');

  // Update team plan if team exists
  await env.DB.prepare(
    'UPDATE teams SET plan = ?, updated_at = ? WHERE owner_id = ?'
  ).bind(planId, new Date().toISOString(), DEFAULT_USER).run();

  return json({ ok: true, plan_id: planId, message: `Plan upgraded to ${planId}` });
};
