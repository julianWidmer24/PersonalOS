-- Personal OS — Initial Schema
-- Run via: supabase db push
-- All tables include user_id FK to auth.users with RLS policies.

-- ── Enable pgcrypto (for gen_random_uuid) ────────────────────
create extension if not exists pgcrypto;

-- ── tasks ────────────────────────────────────────────────────
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null,
  title           text not null,
  description     text,
  category        text,
  priority_score  smallint default 2 check (priority_score between 1 and 5),
  status          text default 'now' check (status in ('now','next','later','done','archived')),
  is_starred      boolean default false,
  project_id      uuid,
  due_date        text,
  estimate        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  deleted_at      timestamptz
);
alter table tasks enable row level security;
drop policy if exists "tasks: own rows" on tasks;
create policy "tasks: own rows" on tasks
  using (auth.uid() = user_id);
drop policy if exists "tasks: insert own" on tasks;
create policy "tasks: insert own" on tasks
  for insert with check (auth.uid() = user_id);
drop policy if exists "tasks: update own" on tasks;
create policy "tasks: update own" on tasks
  for update using (auth.uid() = user_id);
drop policy if exists "tasks: delete own" on tasks;
create policy "tasks: delete own" on tasks
  for delete using (auth.uid() = user_id);

-- ── habits ───────────────────────────────────────────────────
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  icon        text default '◇',
  sort_order  integer default 0,
  subtasks    jsonb default '[]',
  created_at  timestamptz default now()
);
alter table habits enable row level security;
drop policy if exists "habits: own rows" on habits;
create policy "habits: own rows" on habits using (auth.uid() = user_id);
drop policy if exists "habits: insert own" on habits;
create policy "habits: insert own" on habits for insert with check (auth.uid() = user_id);
drop policy if exists "habits: update own" on habits;
create policy "habits: update own" on habits for update using (auth.uid() = user_id);
drop policy if exists "habits: delete own" on habits;
create policy "habits: delete own" on habits for delete using (auth.uid() = user_id);

-- ── habit_logs ───────────────────────────────────────────────
create table if not exists habit_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users on delete cascade not null,
  habit_id            uuid references habits on delete cascade not null,
  date                date not null,
  completed_subtasks  jsonb default '[]',
  is_complete         boolean default false,
  unique (user_id, habit_id, date)
);
alter table habit_logs enable row level security;
drop policy if exists "habit_logs: own rows" on habit_logs;
create policy "habit_logs: own rows" on habit_logs using (auth.uid() = user_id);
drop policy if exists "habit_logs: insert own" on habit_logs;
create policy "habit_logs: insert own" on habit_logs for insert with check (auth.uid() = user_id);
drop policy if exists "habit_logs: update own" on habit_logs;
create policy "habit_logs: update own" on habit_logs for update using (auth.uid() = user_id);

-- ── journal_entries ──────────────────────────────────────────
create table if not exists journal_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null,
  date            date not null default current_date,
  raw_transcript  text,
  ai_summary      text,
  mood            text,
  created_at      timestamptz default now(),
  deleted_at      timestamptz
);
alter table journal_entries enable row level security;
drop policy if exists "journal_entries: own rows" on journal_entries;
create policy "journal_entries: own rows" on journal_entries using (auth.uid() = user_id);
drop policy if exists "journal_entries: insert own" on journal_entries;
create policy "journal_entries: insert own" on journal_entries for insert with check (auth.uid() = user_id);
drop policy if exists "journal_entries: update own" on journal_entries;
create policy "journal_entries: update own" on journal_entries for update using (auth.uid() = user_id);
drop policy if exists "journal_entries: delete own" on journal_entries;
create policy "journal_entries: delete own" on journal_entries for delete using (auth.uid() = user_id);

-- ── meals ────────────────────────────────────────────────────
create table if not exists meals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade not null,
  logged_at         timestamptz default now(),
  description       text not null,
  calories_estimate integer,
  protein_estimate  numeric(6,1),
  source            text default 'manual' check (source in ('manual','telegram','photo')),
  deleted_at        timestamptz
);
alter table meals enable row level security;
drop policy if exists "meals: own rows" on meals;
create policy "meals: own rows" on meals using (auth.uid() = user_id);
drop policy if exists "meals: insert own" on meals;
create policy "meals: insert own" on meals for insert with check (auth.uid() = user_id);
drop policy if exists "meals: update own" on meals;
create policy "meals: update own" on meals for update using (auth.uid() = user_id);
drop policy if exists "meals: delete own" on meals;
create policy "meals: delete own" on meals for delete using (auth.uid() = user_id);

-- ── goals ────────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  timeframe   text default 'month' check (timeframe in ('week','month','year','other')),
  progress    numeric(4,3) default 0 check (progress between 0 and 1),
  target_date text,
  metric      text,
  kind        text,
  is_complete boolean default false,
  created_at  timestamptz default now()
);
alter table goals enable row level security;
drop policy if exists "goals: own rows" on goals;
create policy "goals: own rows" on goals using (auth.uid() = user_id);
drop policy if exists "goals: insert own" on goals;
create policy "goals: insert own" on goals for insert with check (auth.uid() = user_id);
drop policy if exists "goals: update own" on goals;
create policy "goals: update own" on goals for update using (auth.uid() = user_id);
drop policy if exists "goals: delete own" on goals;
create policy "goals: delete own" on goals for delete using (auth.uid() = user_id);

-- ── finance_snapshot ─────────────────────────────────────────
-- TODO: populated by Google Sheets sync edge function on a schedule
create table if not exists finance_snapshot (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null,
  recorded_at     timestamptz default now(),
  net_worth       numeric(14,2),
  daily_change    numeric(10,2),
  monthly_change  numeric(10,2),
  raw_data        jsonb default '{}'
);
alter table finance_snapshot enable row level security;
drop policy if exists "finance_snapshot: own rows" on finance_snapshot;
create policy "finance_snapshot: own rows" on finance_snapshot using (auth.uid() = user_id);
drop policy if exists "finance_snapshot: insert own" on finance_snapshot;
create policy "finance_snapshot: insert own" on finance_snapshot for insert with check (auth.uid() = user_id);

-- ── telegram_events ──────────────────────────────────────────
-- Inbound Telegram messages queued before processing
create table if not exists telegram_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade,
  telegram_chat_id bigint,
  message_text     text,
  audio_file_id    text,
  photo_file_id    text,
  processed        boolean default false,
  created_at       timestamptz default now()
);
alter table telegram_events enable row level security;
drop policy if exists "telegram_events: own rows" on telegram_events;
create policy "telegram_events: own rows" on telegram_events using (auth.uid() = user_id);
drop policy if exists "telegram_events: insert service role" on telegram_events;
create policy "telegram_events: insert service role" on telegram_events
  for insert with check (true); -- webhook inserts before user_id is known; set it during processing

-- ── health_metrics (scaffold for future wearable integration) ──
create table if not exists health_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  date         date not null,
  resting_hr   integer,
  hrv          numeric(6,2),
  sleep_hours  numeric(4,2),
  steps        integer,
  source       text default 'manual',
  unique (user_id, date, source)
);
alter table health_metrics enable row level security;
drop policy if exists "health_metrics: own rows" on health_metrics;
create policy "health_metrics: own rows" on health_metrics using (auth.uid() = user_id);
drop policy if exists "health_metrics: insert own" on health_metrics;
create policy "health_metrics: insert own" on health_metrics for insert with check (auth.uid() = user_id);
drop policy if exists "health_metrics: update own" on health_metrics;
create policy "health_metrics: update own" on health_metrics for update using (auth.uid() = user_id);

-- ── projects ─────────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  description text,
  color       text default '#93c5fd',
  due_date    text,
  status      text default 'active' check (status in ('active','paused','done')),
  created_at  timestamptz default now()
);
alter table projects enable row level security;
drop policy if exists "projects: own rows" on projects;
create policy "projects: own rows" on projects using (auth.uid() = user_id);
drop policy if exists "projects: insert own" on projects;
create policy "projects: insert own" on projects for insert with check (auth.uid() = user_id);
drop policy if exists "projects: update own" on projects;
create policy "projects: update own" on projects for update using (auth.uid() = user_id);
drop policy if exists "projects: delete own" on projects;
create policy "projects: delete own" on projects for delete using (auth.uid() = user_id);

-- ── Daily backup cron (pg_cron) ──────────────────────────────
-- Requires pg_cron extension. Enable it in Supabase dashboard under Extensions.
-- This snippet is commented out — uncomment after enabling pg_cron.
--
-- select cron.schedule(
--   'daily-backup',
--   '0 3 * * *',
--   $$
--     insert into storage.objects (bucket_id, name, owner, metadata)
--     select
--       'backups',
--       'backup_' || to_char(now(), 'YYYY-MM-DD') || '.json',
--       auth.uid(),
--       jsonb_build_object('content_type', 'application/json')
--     ;
--   $$
-- );
