-- 011 — Dashboard mantra (the quote pinned above the greeting).
--
-- One row per user holding { text, author }. Tiny and always read and written
-- whole, so a jsonb column matches the academic_plans pattern rather than
-- earning columns of its own.
--
-- The frontend (useMantra) is offline-first: localStorage is the synchronous
-- cache and this table is the cross-device store. If the table is missing the
-- remote calls simply no-op and the quote keeps saving locally, so applying
-- this is optional but recommended.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

create table if not exists public.dashboard_mantra (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  data       jsonb not null default '{}',   -- { text, author }
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists dashboard_mantra_user_idx on public.dashboard_mantra (user_id);

alter table public.dashboard_mantra enable row level security;
drop policy if exists "dashboard_mantra: own rows"   on public.dashboard_mantra;
create policy "dashboard_mantra: own rows"   on public.dashboard_mantra using (auth.uid() = user_id);
drop policy if exists "dashboard_mantra: insert own" on public.dashboard_mantra;
create policy "dashboard_mantra: insert own" on public.dashboard_mantra for insert with check (auth.uid() = user_id);
drop policy if exists "dashboard_mantra: update own" on public.dashboard_mantra;
create policy "dashboard_mantra: update own" on public.dashboard_mantra for update using (auth.uid() = user_id);
drop policy if exists "dashboard_mantra: delete own" on public.dashboard_mantra;
create policy "dashboard_mantra: delete own" on public.dashboard_mantra for delete using (auth.uid() = user_id);

comment on column public.dashboard_mantra.data is
  'The dashboard quote: { text, author }';
