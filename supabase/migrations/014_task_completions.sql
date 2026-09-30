-- 014 — A durable log of finished tasks, so completion history outlives the task.
--
-- A task marked done is hard-deleted a day later (008 + DONE_TTL_MS), which is
-- deliberate: the board stays clean. But it means the app has no memory of what
-- was finished last Tuesday, and nothing to plot a week/month/year distribution
-- from. This table is that memory: one row per completion, written when a task
-- is checked off and kept after the task row itself is purged.
--
-- `task_id` is ON DELETE SET NULL rather than CASCADE — that is the whole point.
-- The daily purge drops the task; the completion stays, with `title`/`category`
-- copied onto it so the row still says what was done.
--
-- `completed_date` is the *user's local* date, computed by the client. The app
-- counts "done today" and buckets days off this column, and deriving it from a
-- timestamptz in SQL would use the server's zone — an evening check-off west of
-- UTC would land on tomorrow. `completed_at` keeps the exact instant.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

create table if not exists public.task_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  task_id        uuid references public.tasks(id) on delete set null,
  title          text,
  category       text,
  completed_date date not null,
  completed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- Additive guards, in case an earlier hand-made version of the table exists.
alter table public.task_completions add column if not exists title text;
alter table public.task_completions add column if not exists category text;
alter table public.task_completions add column if not exists completed_at timestamptz not null default now();
alter table public.task_completions add column if not exists created_at timestamptz not null default now();

-- One completion per task per local day: checking a task off, unchecking it and
-- checking it again on the same day is one thing done, not three. Historical
-- rows whose task has been purged have a NULL task_id and are exempt (Postgres
-- treats NULLs as distinct), which is correct — they can't be toggled any more.
create unique index if not exists task_completions_task_day_uniq
  on public.task_completions (user_id, task_id, completed_date)
  where task_id is not null;

-- Supports the "last N days for this user, newest first" load.
create index if not exists task_completions_user_date_idx
  on public.task_completions (user_id, completed_date desc);

-- RLS + owner-only policies (idempotent).
alter table public.task_completions enable row level security;
drop policy if exists "task_completions: own rows"   on public.task_completions;
create policy "task_completions: own rows"   on public.task_completions using (auth.uid() = user_id);
drop policy if exists "task_completions: insert own" on public.task_completions;
create policy "task_completions: insert own" on public.task_completions for insert with check (auth.uid() = user_id);
drop policy if exists "task_completions: update own" on public.task_completions;
create policy "task_completions: update own" on public.task_completions for update using (auth.uid() = user_id);
drop policy if exists "task_completions: delete own" on public.task_completions;
create policy "task_completions: delete own" on public.task_completions for delete using (auth.uid() = user_id);

-- Backfill: tasks already sitting in the done bucket with a completion stamp
-- get a row, so the chart isn't empty on the day you run this. `completed_date`
-- is derived server-side here (the client isn't in the loop for a backfill);
-- one historical row can land on a neighbouring day if you finished it near
-- midnight, which is an acceptable one-off.
--
-- Guarded, because this migration does NOT depend on 008: a database that never
-- ran it has no `tasks.completed_at` to read, and a bare INSERT would abort the
-- whole script on a column that isn't there. Without 008 there is simply no
-- history to recover — the counter and the chart start from your next check-off.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'tasks' and column_name = 'completed_at'
  ) then
    execute $q$
      insert into public.task_completions (user_id, task_id, title, category, completed_date, completed_at)
      select t.user_id, t.id, t.title, t.category, (t.completed_at at time zone 'UTC')::date, t.completed_at
        from public.tasks t
       where t.status = 'backlog'
         and t.completed_at is not null
         and not exists (
           select 1 from public.task_completions c
            where c.task_id = t.id and c.completed_date = (t.completed_at at time zone 'UTC')::date
         )
    $q$;
  else
    raise notice 'tasks.completed_at absent (migration 008 not applied) — skipping backfill.';
  end if;
end $$;

-- Stream completions to other open devices, so checking a task off on the phone
-- moves the dashboard's counter on the laptop. RLS still scopes rows per user.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_completions'
  ) then
    alter publication supabase_realtime add table public.task_completions;
  end if;
end $$;

-- PostgREST caches the schema; without this the new table can take a while to
-- become readable from the app.
notify pgrst, 'reload schema';
