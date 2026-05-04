// POST /api/teams/:id/invite — invite member to team
import { Env, uuid, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;
  if (!body.email) return error('email is required');

  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first() as any;
  if (!user) return error('User not found with that email', 404);

  // Check if already a member
  const existing = await env.DB.prepare(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(params.id, user.id).first();
  if (existing) return error('User is already a member');

  const id = uuid();
  await env.DB.prepare(
    `INSERT INTO team_members (id, team_id, user_id, role, invited_by, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, params.id, user.id, body.role || 'member', 'default', new Date().toISOString()).run();

  return json({ ok: true, member_id: id });
};
