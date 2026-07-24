// Supabase Edge Function: /functions/v1/google-calendar
// Authenticated. Actions (via JSON body { action }):
//   'status'     → { connected, email }
//   'disconnect' → deletes stored tokens → { connected: false }
//   (default)    → fetch primary-calendar events for the given week:
//                  body { weekStart: 'YYYY-MM-DD' } → { connected, email, events }
// Events are mapped into the dashboard's weekday model
//   { id, title, day (0=Mon..6=Sun), start, end (hour floats), kind, loc }.
//
// Deploy: supabase functions deploy google-calendar
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, TOKEN_ENDPOINT } from '../_shared/google.ts';

// deno-lint-ignore no-explicit-any
type Supa = any;

async function getAccessToken(supabase: Supa, userId: string): Promise<{ token: string; email: string | null } | null> {
  const { data: row, error } = await supabase.from('google_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (error || !row) return null;

  const exp = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;
  if (row.access_token && exp - 60_000 > Date.now()) {
    return { token: row.access_token, email: row.google_email ?? null };
  }
  if (!row.refresh_token) return null;

  // Refresh the access token.
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) return null;

  await supabase.from('google_tokens').update({
    access_token: tok.access_token,
    token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { token: tok.access_token, email: row.google_email ?? null };
}

// Monday-start weekday (0..6) from a Y-M-D triple, computed in UTC to avoid drift.
function weekdayFromYMD(y: number, m: number, d: number): number {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

// Read wall-clock components straight from the RFC3339 string so the event's own
// timezone is preserved (the edge runtime is UTC; Date parsing would shift hours).
// deno-lint-ignore no-explicit-any
function mapEvent(ev: any) {
  const sdt: string | undefined = ev.start?.dateTime;
  const edt: string | undefined = ev.end?.dateTime;
  const title = ev.summary ?? '(busy)';
  const loc = ev.location ?? '';

  if (!sdt || !edt) {
    // All-day / date-only event → thin marker at the top of its weekday.
    const dOnly: string | undefined = ev.start?.date;
    if (!dOnly) return null;
    const [y, m, d] = dOnly.split('-').map(Number);
    return { id: ev.id, title, day: weekdayFromYMD(y, m, d), start: 8, end: 8.4, kind: 'personal', loc: loc || 'All day' };
  }

  const [sDate, sTime] = sdt.split('T');
  const [eDate, eTime] = edt.split('T');
  const [sy, sm, sd] = sDate.split('-').map(Number);
  const [sh, smin] = sTime.slice(0, 5).split(':').map(Number);
  const [eh, emin] = eTime.slice(0, 5).split(':').map(Number);

  const start = sh + smin / 60;
  let end = eh + emin / 60;
  // Same-day end only; if it rolls past midnight or is malformed, cap at +0.5h.
  if (eDate !== sDate || end <= start) end = Math.min(start + 0.5, 23.5);

  return { id: ev.id, title, day: weekdayFromYMD(sy, sm, sd), start, end, kind: 'personal', loc };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) throw new Error('Unauthorized');

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? new URL(req.url).searchParams.get('action') ?? 'events';

    if (action === 'disconnect') {
      await supabase.from('google_tokens').delete().eq('user_id', user.id);
      return json({ connected: false });
    }

    const cred = await getAccessToken(supabase, user.id);

    if (action === 'status') return json({ connected: !!cred, email: cred?.email ?? null });
    if (!cred) return json({ connected: false, events: [] });

    // Week window. weekStart is the Monday date the frontend is displaying.
    const weekStart: string | undefined = body.weekStart;
    const base = weekStart ? new Date(`${weekStart}T00:00:00Z`) : new Date();
    const monday = new Date(base);
    if (!weekStart) monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    monday.setUTCHours(0, 0, 0, 0);
    const next = new Date(monday);
    next.setUTCDate(monday.getUTCDate() + 7);

    const params = new URLSearchParams({
      timeMin: monday.toISOString(),
      timeMax: next.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '150',
    });
    const evRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${cred.token}` } },
    );
    if (!evRes.ok) {
      if (evRes.status === 401) return json({ connected: false, events: [] });
      throw new Error(`calendar_fetch_failed_${evRes.status}`);
    }
    const data = await evRes.json();
    const events = (data.items ?? []).map(mapEvent).filter((e: unknown) => e !== null);
    return json({ connected: true, email: cred.email, events });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 400);
  }
});
