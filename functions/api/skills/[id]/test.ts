// POST /api/skills/:id/test — test a skill
import { Env, json, error, options } from '../../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const body = (await request.json()) as any;

  const skill = await env.DB.prepare('SELECT * FROM custom_skills WHERE id = ?').bind(params.id).first() as any;
  if (!skill) return error('Skill not found', 404);

  // Simulate a test run
  return json({
    skill_id: params.id,
    skill_name: skill.skill_name,
    status: 'success',
    message: `Skill "${skill.skill_name}" test completed successfully.`,
    test_input: body,
    test_output: { result: 'Test execution simulated', timestamp: new Date().toISOString() },
  });
};
