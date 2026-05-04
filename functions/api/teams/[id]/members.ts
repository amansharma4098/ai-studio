// GET /api/teams/:id/members — list team members
import { Env, json, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const { results } = await env.DB.prepare(
    `SELECT tm.*, u.email, u.name as user_name
     FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     WHERE tm.team_id = ?
     ORDER BY tm.joined_at ASC`
  ).bind(params.id).all();
  return json(results || []);
};
