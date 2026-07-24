-- 005 — Reconcile repo migrations with the live database (NON-DESTRUCTIVE).
--
-- Context: the live Supabase schema drifted from migrations 001–004 (it was
-- edited through the dashboard). This script is safe to run against the live DB
-- from the Supabase SQL Editor: every statement is idempotent and additive
-- (`if not exists` / `add column if not exists`). It creates nothing that would
-- overwrite existing data and drops nothing.
--
-- HOW TO APPLY: paste this whole file into Supabase → SQL Editor → Run.
-- Do NOT run `supabase db push` (that would try to apply 001's conflicting
-- shapes and, before it was neutralized, 002's destructive drop).

-- ── 1. Link tasks → projects so assignments survive reload (migration 003) ──
alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists tasks_project_id_idx on public.tasks (project_id);

-- ── 2. habit_completions: canonical habit-tracking table (make reproducible) ──
-- The frontend reads/writes: habit_id, user_id, completed_date, fully_completed,
-- completed_subtasks. Defined here so a fresh DB rebuild matches production.
create table if not exists public.habit_completions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users on delete cascade not null,
  habit_id           uuid references public.habits on delete cascade not null,
  completed_date     date not null,
  completed_subtasks jsonb default '[]',
  fully_completed    boolean default false,
  created_at         timestamptz default now(),
  unique (user_id, habit_id, completed_date)
);

-- Additive column guards (in case the live table predates any of these columns)
alter table public.habit_completions add column if not exists completed_subtasks jsonb default '[]';
alter table public.habit_completions add column if not exists fully_completed boolean default false;
alter table public.habit_completions add column if not exists created_at timestamptz default now();

-- RLS + owner policies (idempotent)
alter table public.habit_completions enable row level security;
drop policy if exists "habit_completions: own rows"   on public.habit_completions;
create policy "habit_completions: own rows"   on public.habit_completions using (auth.uid() = user_id);
drop policy if exists "habit_completions: insert own" on public.habit_completions;
create policy "habit_completions: insert own" on public.habit_completions for insert with check (auth.uid() = user_id);
drop policy if exists "habit_completions: update own" on public.habit_completions;
create policy "habit_completions: update own" on public.habit_completions for update using (auth.uid() = user_id);
drop policy if exists "habit_completions: delete own" on public.habit_completions;
create policy "habit_completions: delete own" on public.habit_completions for delete using (auth.uid() = user_id);

-- ── 3. Ensure realtime is enabled for the tables the dashboard subscribes to ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'habit_completions'
  ) then
    alter publication supabase_realtime add table public.habit_completions;
  end if;
end$$;
