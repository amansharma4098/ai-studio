// GET /api/billing/plans — list plans
import { json, options } from '../_helpers';

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestGet: PagesFunction = async () => {
  return json([
    {
      id: 'free', name: 'Free', price_monthly: 0, price_yearly: 0,
      features: ['50 messages / day', '3 expert agents', 'Claude & GPT-4 access', 'Community support'],
      limits: { messages_per_day: 50, agents: 3, team_members: 1 },
    },
    {
      id: 'pro', name: 'Pro', price_monthly: 19, price_yearly: 190,
      features: ['Unlimited messages', 'All expert agents', 'All AI models', 'Custom agent builder', 'Agent deployments', 'Priority support'],
      limits: { messages_per_day: -1, agents: -1, team_members: 5 },
    },
    {
      id: 'enterprise', name: 'Enterprise', price_monthly: 99, price_yearly: 990,
      features: ['Everything in Pro', 'Team collaboration', 'Workflow automation', 'Custom integrations', 'Dedicated support', 'SSO & audit logs'],
      limits: { messages_per_day: -1, agents: -1, team_members: -1 },
    },
  ]);
};
