-- 006 — Physical Activity persistence (physique photos + workout routine/log).
--
-- Groundwork for moving PhysicalActivity off localStorage (usePhysique /
-- usePhysical) onto Supabase so the data syncs across devices. NON-DESTRUCTIVE
-- and idempotent — safe to run in the Supabase SQL Editor.
--
-- NOTE: apply this ONLY when you're ready to wire the frontend hooks to it.
-- Until the hooks are migrated, the app keeps using localStorage and these
-- tables simply sit empty. (See the session summary for the frontend plan.)

-- ── physique_entries: weekly progress photos ─────────────────
-- `photo` mirrors the current base64 data URL. For production, prefer uploading
-- to Supabase Storage and storing the object path instead of inline base64.
create table if not exists public.physique_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  week        integer,
  label       text,
  entry_date  date default current_date,
  photo       text,
  created_at  timestamptz default now()
);
alter table public.physique_entries enable row level security;
drop policy if exists "physique_entries: own rows"   on public.physique_entries;
create policy "physique_entries: own rows"   on public.physique_entries using (auth.uid() = user_id);
drop policy if exists "physique_entries: insert own" on public.physique_entries;
create policy "physique_entries: insert own" on public.physique_entries for insert with check (auth.uid() = user_id);
drop policy if exists "physique_entries: update own" on public.physique_entries;
create policy "physique_entries: update own" on public.physique_entries for update using (auth.uid() = user_id);
drop policy if exists "physique_entries: delete own" on public.physique_entries;
create policy "physique_entries: delete own" on public.physique_entries for delete using (auth.uid() = user_id);

-- ── workout_routines: the parsed weekly split (one active per user) ──
create table if not exists public.workout_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  raw         text,
  workouts    jsonb default '[]',   -- [{ id, name, exercises[] }]
  is_active   boolean default true,
  imported_at timestamptz default now()
);
alter table public.workout_routines enable row level security;
drop policy if exists "workout_routines: own rows"   on public.workout_routines;
create policy "workout_routines: own rows"   on public.workout_routines using (auth.uid() = user_id);
drop policy if exists "workout_routines: insert own" on public.workout_routines;
create policy "workout_routines: insert own" on public.workout_routines for insert with check (auth.uid() = user_id);
drop policy if exists "workout_routines: update own" on public.workout_routines;
create policy "workout_routines: update own" on public.workout_routines for update using (auth.uid() = user_id);
drop policy if exists "workout_routines: delete own" on public.workout_routines;
create policy "workout_routines: delete own" on public.workout_routines for delete using (auth.uid() = user_id);

-- ── workout_log_days: one row per completed/confirmed day ────
-- Replaces the localStorage WorkoutLog.entries map. `streak` stays derived
-- in the frontend from these rows.
create table if not exists public.workout_log_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  log_date    date not null,
  confirmed   boolean default true,
  photo       text,
  idx         integer,
  created_at  timestamptz default now(),
  unique (user_id, log_date)
);
alter table public.workout_log_days enable row level security;
drop policy if exists "workout_log_days: own rows"   on public.workout_log_days;
create policy "workout_log_days: own rows"   on public.workout_log_days using (auth.uid() = user_id);
drop policy if exists "workout_log_days: insert own" on public.workout_log_days;
create policy "workout_log_days: insert own" on public.workout_log_days for insert with check (auth.uid() = user_id);
drop policy if exists "workout_log_days: update own" on public.workout_log_days;
create policy "workout_log_days: update own" on public.workout_log_days for update using (auth.uid() = user_id);
drop policy if exists "workout_log_days: delete own" on public.workout_log_days;
create policy "workout_log_days: delete own" on public.workout_log_days for delete using (auth.uid() = user_id);

-- ── realtime ─────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['physique_entries','workout_routines','workout_log_days'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
