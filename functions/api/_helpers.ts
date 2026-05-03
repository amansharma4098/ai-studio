// Shared helpers for Cloudflare Pages Functions

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function uuid(): string {
  return crypto.randomUUID();
}

export function json(data: any, status = 200) {
  return Response.json(data, { status, headers: CORS });
}

export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: CORS });
}

export function options() {
  return new Response(null, { headers: CORS });
}

// Default user ID (since auth is removed)
export const DEFAULT_USER = 'default';
