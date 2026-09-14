-- 013 — Keep a task's tracked time when its stopwatch is paused.
--
-- 012 gave a running task a `started_at`, but stopping it threw the elapsed
-- time away. This banks it instead: pausing adds the running segment to
-- `time_spent_ms` and clears `started_at`, so a task's total time is
--
--   time_spent_ms + (started_at is null ? 0 : now() - started_at)
--
-- Both live on the row, so every device computes the same total and a reload
-- picks up exactly where the clock was.
--
-- Includes 012's column too, so this one script is enough on a DB that never
-- ran 012. NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

alter table public.tasks
  add column if not exists started_at timestamptz;

create index if not exists tasks_started_at_idx
  on public.tasks (started_at)
  where started_at is not null;

alter table public.tasks
  add column if not exists time_spent_ms bigint not null default 0;

-- PostgREST caches the schema; without this the new columns can take a while
-- to become writable from the app.
notify pgrst, 'reload schema';
