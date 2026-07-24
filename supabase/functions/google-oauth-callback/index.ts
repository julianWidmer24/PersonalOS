// Supabase Edge Function: /functions/v1/google-oauth-callback
// Google redirects the user's browser here with ?code & ?state. We verify the
// signed state, exchange the code for tokens, store them (service role), then
// redirect the browser back into the app.
//
// ⚠️ Deploy WITHOUT JWT verification (Google calls this, no Supabase JWT):
//   supabase functions deploy google-oauth-callback --no-verify-jwt
// Env (supabase secrets set KEY=value):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
//   OAUTH_STATE_SECRET, APP_URL (frontend origin, e.g. https://your-app.vercel.app)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyState, TOKEN_ENDPOINT } from '../_shared/google.ts';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const appUrl = Deno.env.get('APP_URL') ?? '';
  const back = (qs: string) => Response.redirect(`${appUrl}/settings?${qs}`, 302);
  const fail = (reason: string) => back(`google=error&reason=${encodeURIComponent(reason)}`);

  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthErr = url.searchParams.get('error');
    if (oauthErr) return fail(oauthErr);
    if (!code || !state) return fail('missing_code');

    const stateSecret = Deno.env.get('OAUTH_STATE_SECRET') ?? '';
    const userId = await verifyState(state, stateSecret);
    if (!userId) return fail('bad_state');

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') ?? '';

    // Exchange authorization code for tokens.
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok) return fail(tok.error ?? 'token_exchange_failed');

    // Best-effort: the primary calendar id is usually the user's email.
    let email: string | null = null;
    try {
      const c = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (c.ok) email = (await c.json()).id ?? null;
    } catch { /* ignore */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const patch: Record<string, unknown> = {
      user_id: userId,
      access_token: tok.access_token,
      token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      scope: tok.scope,
      google_email: email,
      updated_at: new Date().toISOString(),
    };
    // Google only returns refresh_token on first consent; keep the old one otherwise.
    if (tok.refresh_token) patch.refresh_token = tok.refresh_token;

    const { error } = await supabase.from('google_tokens').upsert(patch, { onConflict: 'user_id' });
    if (error) return fail('store_failed');

    return back('google=connected');
  } catch (e) {
    return fail((e as Error).message ?? 'unknown');
  }
});
