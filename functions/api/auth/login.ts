// POST /api/auth/login — authenticate user
import { Env, json, error, options } from '../_helpers';
import { verifyPassword, createJWT } from './_crypto';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const { email, password } = body;

  if (!email || !password) {
    return error('Email and password are required');
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, organization, org_name, role, is_active FROM users WHERE email = ?'
  ).bind(email.toLowerCase().trim()).first() as any;

  if (!user) {
    return error('Invalid email or password', 401);
  }

  if (!user.is_active) {
    return error('Account is deactivated', 403);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return error('Invalid email or password', 401);
  }

  const token = await createJWT({ sub: user.id, email: user.email, name: user.name });

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.org_name || user.organization || null,
    },
    token,
  });
};
