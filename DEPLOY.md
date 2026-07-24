# Deploying Personal OS

Goal: run the app on the internet (no local `npm run dev`) and turn on Google
Calendar sync. Two hosts:

- **Frontend (the React app)** → **Vercel** (static site, auto-deploys on git push)
- **Backend (database + edge functions)** → **Supabase** (already your project
  `ypaqiqwqcfeyvgclzveu`)

Your Supabase function base URL is:
`https://ypaqiqwqcfeyvgclzveu.supabase.co/functions/v1/`

Do the parts in order. Part A gets the app online; Parts B–D turn on Calendar.

---

## Part A — Put the app on Vercel

1. **Push the repo to GitHub.** From the project folder:
   ```bash
   # if you haven't already created a GitHub repo:
   git branch -M main
   git remote add origin https://github.com/<you>/personal-os.git
   git push -u origin main
   ```
   (You already have local commits from our sessions.)

2. **Import into Vercel.** Go to vercel.com → **Add New → Project** → import the
   GitHub repo. Vercel auto-detects Vite. The included `vercel.json` already sets
   the build command (`npm run build`), output (`dist`), and the SPA rewrite so
   deep links like `/settings` and `/calendar` work.

3. **Add environment variables** (Project → Settings → Environment Variables).
   Copy the values from your local `.env.local`:
   ```
   VITE_SUPABASE_URL       = https://ypaqiqwqcfeyvgclzveu.supabase.co
   VITE_SUPABASE_ANON_KEY  = <your anon/publishable key>
   ```
   Only the **anon** (publishable) key — never the service-role key.

4. **Deploy.** Vercel builds and gives you a URL like
   `https://personal-os-xxxx.vercel.app`. Open it and log in — the app now runs
   without a local server. **Note this URL; it's your `APP_URL` below.**

   From now on, every `git push` to `main` auto-deploys.

If the app loads but data doesn't, double-check the two env vars and redeploy.

---

## Part B — Apply the database migrations

In the **Supabase dashboard → SQL Editor**, paste and run each of these files
from `supabase/migrations/` (see `supabase/APPLY_THESE.md` for details). They are
idempotent and non-destructive:

- `005_reconcile_live_schema.sql`  (task↔project + habit_completions)
- `006_physical_activity.sql`      (workouts/physique sync)
- `007_google_tokens.sql`          (Google token store — required for Calendar)

⚠️ Never run `supabase db push` — your live schema has drifted from the older
migrations and a push would try to force conflicting shapes.

---

## Part C — Create Google OAuth credentials

1. Go to **console.cloud.google.com** → create a project (e.g. "Personal OS").
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - App name, your email for support/developer contact.
   - **Scopes**: Add `.../auth/calendar.readonly`.
   - **Test users**: add your own Google email. (In "Testing" mode this is all
     you need; the app stays private to test users.)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs** → add exactly:
     ```
     https://ypaqiqwqcfeyvgclzveu.supabase.co/functions/v1/google-oauth-callback
     ```
   - Create, then copy the **Client ID** and **Client secret**.

---

## Part D — Deploy the edge functions + set secrets

1. **Install & link the Supabase CLI** (once):
   ```bash
   npm install -g supabase        # or: brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref ypaqiqwqcfeyvgclzveu
   ```

2. **Set the secrets** (replace the placeholders). `OAUTH_STATE_SECRET` is any
   long random string — generate one with `openssl rand -hex 32`:
   ```bash
   supabase secrets set \
     GOOGLE_CLIENT_ID="<client id>" \
     GOOGLE_CLIENT_SECRET="<client secret>" \
     GOOGLE_REDIRECT_URI="https://ypaqiqwqcfeyvgclzveu.supabase.co/functions/v1/google-oauth-callback" \
     OAUTH_STATE_SECRET="<random 32+ char string>" \
     APP_URL="https://<your-app>.vercel.app"
   ```
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

3. **Deploy the three functions.** The callback must skip JWT verification
   because Google (not your app) calls it:
   ```bash
   supabase functions deploy google-oauth-start
   supabase functions deploy google-oauth-callback --no-verify-jwt
   supabase functions deploy google-calendar
   ```
   (Your existing `classify` and `telegram-webhook` functions are unaffected.)

---

## Part E — Connect and test

1. Open your Vercel URL → **Settings → Integrations → Google Calendar → Connect**.
2. You'll be sent to Google. Because the app is in "Testing", you may see an
   "unverified app" screen → **Advanced → Go to Personal OS (unsafe)** → allow.
3. Google returns you to `…/settings?google=connected`. The row shows
   **Connected**, and the **Calendar** page now shows your real events (with a
   green **GCal** badge). Disconnect anytime from the same row.

### If something fails
- The Settings row shows an error banner → the functions aren't deployed or a
  secret is missing/typo'd. Check `supabase functions logs google-calendar`.
- `redirect_uri_mismatch` from Google → the URI in Part C step 4 must match
  `GOOGLE_REDIRECT_URI` **exactly** (no trailing slash).
- Connected but no events → confirm `007_google_tokens.sql` ran and you granted
  the calendar scope. Re-run Connect to force a fresh consent.

---

## Optional — custom domain
In Vercel → Project → **Domains**, add a domain you own. Then update `APP_URL`
in Supabase secrets to the new domain and redeploy the functions, and add the
new domain's callback URL is **not** needed (the callback stays on Supabase).

## Ongoing
- Code changes: `git push` → Vercel redeploys the frontend automatically.
- Function changes: re-run the relevant `supabase functions deploy …`.
- Schema changes: run new migration SQL in the Supabase SQL Editor.
