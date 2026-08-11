-- 008 — Track when a task was completed, so done tasks can auto-expire.
--
-- The frontend persists "done" as the live DB's `backlog` status bucket (see
-- STATUS_TO_DB in src/context/DashboardContext.tsx); there was no record of
-- *when* it got there, so nothing could age it out. This adds that timestamp.
--
-- The app deletes done tasks 3 weeks after `completed_at`. Rows with a NULL
-- `completed_at` are never deleted (SQL comparisons against NULL are false), so
-- the backfill below gives any already-done task a fresh 3-week clock starting
-- now rather than deleting it on the next load.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

alter table public.tasks
  add column if not exists completed_at timestamptz;

-- Backfill: existing done/backlog rows start their 3 weeks from now.
update public.tasks
   set completed_at = now()
 where status = 'backlog'
   and completed_at is null;

-- Supports the `status = 'backlog' and completed_at < cutoff` purge query.
create index if not exists tasks_completed_at_idx
  on public.tasks (completed_at)
  where completed_at is not null;
