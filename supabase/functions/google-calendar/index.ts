// Supabase Edge Function: /functions/v1/google-calendar
// Authenticated. Actions (via JSON body { action }):
//   'status'     → { connected, email }
//   'disconnect' → deletes stored tokens → { connected: false }
//   (default)    → fetch events for the given week from EVERY calendar in the
//                  account that is visible in the user's Google Calendar list
//                  (not just 'primary'):
//                  body { weekStart: 'YYYY-MM-DD' } → { connected, email, events, calendars }
// Events are mapped into the dashboard's weekday model
//   { id, title, day (0=Mon..6=Sun), start, end (hour floats), kind, loc,
//     calendar, calendarColor }.
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

interface CalMeta { id: string; name: string; color: string }

// Read wall-clock components straight from the RFC3339 string so the event's own
// timezone is preserved (the edge runtime is UTC; Date parsing would shift hours).
// deno-lint-ignore no-explicit-any
function mapEvent(ev: any, cal: CalMeta) {
  const sdt: string | undefined = ev.start?.dateTime;
  const edt: string | undefined = ev.end?.dateTime;
  const title = ev.summary ?? '(busy)';
  const loc = ev.location ?? '';
  // Event ids are only unique within one calendar, so namespace them — two
  // calendars can otherwise collide and React drops one of the two blocks.
  const id = `${cal.id}:${ev.id}`;
  // iCalUID is stable across every copy of an invitation, so it's what tells us
  // two calendars are showing the same underlying event. Stripped before send.
  const from = { uid: (ev.iCalUID ?? ev.id) as string, calendar: cal.name, calendarColor: cal.color };

  if (!sdt || !edt) {
    // All-day / date-only event → thin marker at the top of its weekday.
    const dOnly: string | undefined = ev.start?.date;
    if (!dOnly) return null;
    const [y, m, d] = dOnly.split('-').map(Number);
    return { id, title, day: weekdayFromYMD(y, m, d), start: 8, end: 8.4, kind: 'personal', loc: loc || 'All day', ...from };
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

  return { id, title, day: weekdayFromYMD(sy, sm, sd), start, end, kind: 'personal', loc, ...from };
}

// Cancelled instances of a recurring event still come back in the feed; drop
// them so a deleted occurrence doesn't linger on the grid.
// deno-lint-ignore no-explicit-any
function mapCalendarItems(items: any[], cal: CalMeta) {
  return items
    .filter((ev) => ev.status !== 'cancelled')
    .map((ev) => mapEvent(ev, cal))
    .filter((e) => e !== null);
}

// Every calendar the account can read. `selected` mirrors the checkbox in the
// Google Calendar sidebar, so unticking one there hides it here too; `hidden`
// calendars and cancelled subscriptions are dropped outright.
async function listCalendars(token: string): Promise<CalMeta[]> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    // Fall back to the primary calendar rather than showing an empty week.
    if (res.status === 401) throw new Error('unauthorized');
    return [{ id: 'primary', name: 'Calendar', color: '' }];
  }
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  return (data.items ?? [])
    .filter((c: any) => c.selected !== false && !c.hidden && !c.deleted)
    .map((c: any) => ({
      id: c.id as string,
      name: (c.summaryOverride ?? c.summary ?? c.id) as string,
      color: (c.backgroundColor ?? '') as string,
    }));
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

    let calendars: CalMeta[];
    try {
      calendars = await listCalendars(cred.token);
    } catch {
      return json({ connected: false, events: [] });
    }

    const params = new URLSearchParams({
      timeMin: monday.toISOString(),
      timeMax: next.toISOString(),
      singleEvents: 'true',   // expand recurring events into instances
      orderBy: 'startTime',
      maxResults: '250',
    });

    // One request per calendar, in parallel. A single failing calendar (revoked
    // share, deleted subscription) yields an empty list instead of failing the
    // whole week.
    const perCalendar = await Promise.all(calendars.map(async (cal) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
          { headers: { Authorization: `Bearer ${cred.token}` } },
        );
        if (res.status === 401) throw new Error('unauthorized');
        if (!res.ok) return [];
        const data = await res.json();
        return mapCalendarItems(data.items ?? [], cal);
      } catch (err) {
        if ((err as Error).message === 'unauthorized') throw err;
        return [];
      }
    })).catch((err) => {
      if ((err as Error).message === 'unauthorized') return null;
      throw err;
    });

    if (perCalendar === null) return json({ connected: false, events: [] });

    // An event you're invited to can sit on several of your calendars at once;
    // keep the first copy of each so it renders once, not three times.
    const seen = new Set<string>();
    const events = perCalendar.flat()
      .filter((e) => {
        const key = `${e.uid}|${e.day}|${e.start}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ uid: _uid, ...e }) => e);

    return json({
      connected: true,
      email: cred.email,
      events,
      calendars: calendars.map((c) => ({ name: c.name, color: c.color })),
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 400);
  }
});
