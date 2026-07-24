// Shared helpers for the Google Calendar OAuth edge functions.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// State = base64url(userId) + "." + HMAC, so the (JWT-less) callback can trust
// which user started the flow without a database round-trip.
export async function signState(userId: string, secret: string): Promise<string> {
  const payload = btoa(userId).replace(/=+$/, '');
  return `${payload}.${await hmacHex(secret, payload)}`;
}

export async function verifyState(state: string, secret: string): Promise<string | null> {
  const [payload, mac] = state.split('.');
  if (!payload || !mac) return null;
  const expected = await hmacHex(secret, payload);
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try { return atob(payload); } catch { return null; }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
