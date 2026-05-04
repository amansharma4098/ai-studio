// POST /api/documents/upload — upload a document
import { Env, uuid, json, error, options, DEFAULT_USER } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return error('No file provided');

    const id = uuid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO documents (id, user_id, file_name, file_path, file_size, mime_type, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, DEFAULT_USER,
      file.name,
      `/documents/${id}/${file.name}`,
      file.size,
      file.type || 'application/octet-stream',
      now
    ).run();

    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
    return json(doc, 201);
  } catch (err: any) {
    return error(err.message || 'Upload failed', 500);
  }
};
