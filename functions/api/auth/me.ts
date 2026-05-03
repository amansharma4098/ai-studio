// GET /api/auth/me — get current user from JWT
import { Env, json, error, options } from '../_helpers';
import { verifyJWT } from './_crypto';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error('Not authenticated', 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token);
  if (!payload) {
    return error('Invalid or expired token', 401);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, organization, org_name, role, account_type, is_active, created_at FROM users WHERE id = ?'
  ).bind(payload.sub).first() as any;

  if (!user || !user.is_active) {
    return error('User not found', 404);
  }

  return json({
    id: user.id,
    email: user.email,
    name: user.name,
    organization: user.org_name || user.organization || null,
    role: user.role,
    account_type: user.account_type,
  });
};
