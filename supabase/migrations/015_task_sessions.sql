-- 015 — Record *when* time was spent on a task, not just how much.
--
-- 012/013 gave a task `started_at` + `time_spent_ms`: a running mark and a
-- running total. Pausing folds the stint into the total and clears the mark,
-- so a task worked 8:00–10:23pm persists as `time_spent_ms = 8580000` and
-- nothing else. The duration survives; the placement is gone. Work the same
-- task three times in a day and it is one summed number.
--
-- A calendar needs intervals, so this table stores one row per stint:
-- `started_at` when the stopwatch starts, `ended_at` when it stops. A row with
-- a NULL `ended_at` is running right now and renders up to the current time.
--
-- Deliberately overlapping-friendly: two tasks running at once is a supported
-- state, so nothing here constrains one session per *user*. The partial unique
-- index only stops the same task opening twice, which is a double-click, not a
-- workflow.
--
-- Like 014, a session outlives its task: `task_id` is ON DELETE SET NULL and
-- title/category/project_id are copied onto the row, so a block still renders
-- with the right label and colour after the daily purge takes the task.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

create table if not exists public.task_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  task_id    uuid references public.tasks(id) on delete set null,
  title      text,
  category   text,
  -- Copied, not joined: the block's colour comes from the project, and the
  -- task that knew the project is gone a day later. SET NULL rather than
  -- CASCADE so deleting a project never deletes the hours you put into it.
  project_id uuid references public.projects(id) on delete set null,
  started_at timestamptz not null,
  ended_at   timestamptz,
  created_at timestamptz not null default now(),
  constraint task_sessions_span_ok check (ended_at is null or ended_at >= started_at)
);

-- Additive guards, in case an earlier hand-made version of the table exists.
alter table public.task_sessions add column if not exists title text;
alter table public.task_sessions add column if not exists category text;
alter table public.task_sessions add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.task_sessions add column if not exists created_at timestamptz not null default now();

-- One open stint per task. Two *different* tasks running at once is allowed and
-- expected — that is what the overlapping blocks in the calendar are for.
create unique index if not exists task_sessions_open_uniq
  on public.task_sessions (task_id)
  where ended_at is null and task_id is not null;

-- Supports the "this user's sessions in a date window, newest first" load.
create index if not exists task_sessions_user_started_idx
  on public.task_sessions (user_id, started_at desc);

-- RLS + owner-only policies (idempotent).
alter table public.task_sessions enable row level security;
drop policy if exists "task_sessions: own rows"   on public.task_sessions;
create policy "task_sessions: own rows"   on public.task_sessions using (auth.uid() = user_id);
drop policy if exists "task_sessions: insert own" on public.task_sessions;
create policy "task_sessions: insert own" on public.task_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "task_sessions: update own" on public.task_sessions;
create policy "task_sessions: update own" on public.task_sessions for update using (auth.uid() = user_id);
drop policy if exists "task_sessions: delete own" on public.task_sessions;
create policy "task_sessions: delete own" on public.task_sessions for delete using (auth.uid() = user_id);

-- Backfill: a task whose stopwatch is running right now has a real start time,
-- so it gets an open session and appears on the calendar immediately. Banked
-- `time_spent_ms` cannot be recovered — no timestamps were ever written for it —
-- so past work stays absent and the calendar fills from here on.
--
-- Guarded: this migration does not depend on 012/013, and a bare INSERT would
-- abort the whole script on a database with no `tasks.started_at`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'tasks' and column_name = 'started_at'
  ) then
    execute $q$
      insert into public.task_sessions (user_id, task_id, title, category, project_id, started_at)
      select t.user_id, t.id, t.title, t.category, t.project_id, t.started_at
        from public.tasks t
       where t.started_at is not null
         and not exists (
           select 1 from public.task_sessions s
            where s.task_id = t.id and s.ended_at is null
         )
    $q$;
  else
    raise notice 'tasks.started_at absent (migration 012/013 not applied) — skipping backfill.';
  end if;
end $$;

-- Stream sessions to other devices, so starting a task on the phone draws its
-- block on the laptop's calendar live. RLS still scopes rows per user.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_sessions'
  ) then
    alter publication supabase_realtime add table public.task_sessions;
  end if;
end $$;

notify pgrst, 'reload schema';
