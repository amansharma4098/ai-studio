// POST /api/auth/signup — register new user
import { Env, uuid, json, error, options } from '../_helpers';
import { hashPassword, createJWT, setJWTSecret } from './_crypto';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (env.JWT_SECRET) setJWTSecret(env.JWT_SECRET);
  const body = (await request.json()) as any;
  const { email, name, password, account_type, org_name } = body;

  if (!email || !name || !password) {
    return error('Email, name, and password are required');
  }
  if (password.length < 6) {
    return error('Password must be at least 6 characters');
  }

  // Check if email exists
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
  if (existing) {
    return error('An account with this email already exists', 409);
  }

  const id = uuid();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, account_type, org_name, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'user', 1, ?)`
  ).bind(id, email.toLowerCase().trim(), name, passwordHash, account_type || 'individual', org_name || null, now).run();

  const token = await createJWT({ sub: id, email: email.toLowerCase().trim(), name });

  return json({
    user: { id, email: email.toLowerCase().trim(), name, organization: org_name || null },
    token,
  }, 201);
};
