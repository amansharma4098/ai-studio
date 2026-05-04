// DELETE /api/teams/:id/members/:userId — remove team member
import { Env, json, options } from '../../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  await env.DB.prepare(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(params.id, params.userId).run();
  return json({ ok: true });
};
