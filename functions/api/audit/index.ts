// GET /api/audit/ — list audit logs
import { Env, json, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const resourceType = url.searchParams.get('resource_type');
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  let query = 'SELECT * FROM audit_logs WHERE user_id = ?';
  const bindings: any[] = [DEFAULT_USER];

  if (action) {
    query += ' AND action = ?';
    bindings.push(action);
  }
  if (resourceType) {
    query += ' AND resource_type = ?';
    bindings.push(resourceType);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  bindings.push(limit);

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return json(results || []);
};
