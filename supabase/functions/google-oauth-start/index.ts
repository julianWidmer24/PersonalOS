// Supabase Edge Function: /functions/v1/google-oauth-start
// Returns a Google OAuth consent URL for the authenticated user. The frontend
// redirects the browser to that URL; Google then calls google-oauth-callback.
//
// Deploy: supabase functions deploy google-oauth-start
// Env (supabase secrets set KEY=value):
//   GOOGLE_CLIENT_ID          — from Google Cloud OAuth client
//   GOOGLE_REDIRECT_URI       — the google-oauth-callback function URL
//   OAUTH_STATE_SECRET        — any long random string (HMAC signing)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, signState, GOOGLE_SCOPE, AUTH_ENDPOINT } from '../_shared/google.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) throw new Error('Unauthorized');

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
    const stateSecret = Deno.env.get('OAUTH_STATE_SECRET');
    if (!clientId || !redirectUri || !stateSecret) throw new Error('Google OAuth env not configured');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPE,
      access_type: 'offline',   // ask for a refresh token
      prompt: 'consent',        // force refresh token issuance on reconnect
      include_granted_scopes: 'true',
      state: await signState(user.id, stateSecret),
    });

    return json({ url: `${AUTH_ENDPOINT}?${params.toString()}` });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 400);
  }
});
