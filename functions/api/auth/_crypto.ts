// Password hashing and JWT using Web Crypto API (Cloudflare Workers compatible)

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(password, salt);
  const hash = await crypto.subtle.exportKey('raw', key);
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(SALT_LENGTH + hashArray.length);
  combined.set(salt, 0);
  combined.set(hashArray, SALT_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_LENGTH);
  const storedHash = combined.slice(SALT_LENGTH);
  const key = await deriveKey(password, salt);
  const hash = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  if (hash.length !== storedHash.length) return false;
  let match = true;
  for (let i = 0; i < hash.length; i++) {
    if (hash[i] !== storedHash[i]) match = false;
  }
  return match;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'HMAC', hash: 'SHA-256', length: KEY_LENGTH },
    true,
    ['sign']
  );
}

// Simple JWT using HMAC-SHA256
const JWT_SECRET = 'ai-studio-jwt-secret-change-in-prod';

export async function createJWT(payload: Record<string, any>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + 86400 }; // 24h expiry

  const enc = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(claims));
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey('raw', enc.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = base64url(String.fromCharCode(...new Uint8Array(sig)));

  return `${data}.${sigB64}`;
}

export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const enc = new TextEncoder();
    const data = `${parts[0]}.${parts[1]}`;
    const sig = Uint8Array.from(base64urlDecode(parts[2]), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey('raw', enc.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
    if (!valid) return null;

    const payload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}
