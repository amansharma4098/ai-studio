// GET /api/teams/ — list teams
// POST /api/teams/ — create team
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
     FROM teams t
     WHERE t.owner_id = ? OR t.id IN (SELECT team_id FROM team_members WHERE user_id = ?)
     ORDER BY t.created_at DESC`
  ).bind(DEFAULT_USER, DEFAULT_USER).all();
  return json(results || []);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  if (!body.name) return error('name is required');

  const id = uuid();
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '-' + id.slice(0, 6);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO teams (id, name, slug, description, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.name, slug, body.description || '', DEFAULT_USER, now, now).run();

  // Add owner as member
  await env.DB.prepare(
    `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(uuid(), id, DEFAULT_USER, 'owner', now).run();

  const team = await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first();
  return json(team, 201);
};
