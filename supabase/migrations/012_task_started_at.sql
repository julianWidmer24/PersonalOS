-- 012 — Track when a task was marked in progress, so the stopwatch survives.
--
-- The dashboard's "In progress" widget counts up from this timestamp. Keeping
-- it in the row (rather than in localStorage) means the elapsed time is the
-- same on every device, and a reload doesn't reset the clock.
--
-- NULL means the task isn't in progress. Starting a task stamps now(); stopping
-- it, or marking it done, clears the column back to NULL.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

alter table public.tasks
  add column if not exists started_at timestamptz;

-- Supports "which tasks are running?" without scanning every row.
create index if not exists tasks_started_at_idx
  on public.tasks (started_at)
  where started_at is not null;
