-- 007 — Google OAuth token store for the Calendar integration.
--
-- Holds each user's Google refresh/access tokens. These are SECRETS: the table
-- has RLS enabled with NO client-facing policies, so the anon/authenticated
-- keys can never read or write it. Only edge functions using the service-role
-- key (which bypasses RLS) touch this table. The frontend learns whether it's
-- connected via the `google-calendar` function's `status` action, never by
-- reading tokens directly.
--
-- Idempotent + non-destructive. Apply in Supabase → SQL Editor → Run.

create table if not exists public.google_tokens (
  user_id       uuid primary key references auth.users on delete cascade,
  access_token  text,
  refresh_token text,
  token_expiry  timestamptz,           -- when access_token expires
  scope         text,
  google_email  text,                  -- non-secret, for display ("Connected as …")
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS on, but intentionally NO policies → clients are fully blocked; only the
-- service role (edge functions) can access. Do not add permissive policies here.
alter table public.google_tokens enable row level security;

-- Defensive: if any policy was ever added by hand, this documents the intent.
-- (No create policy statements — service role bypasses RLS.)
