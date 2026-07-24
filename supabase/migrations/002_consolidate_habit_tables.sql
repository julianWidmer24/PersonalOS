-- ⚠️ NEUTRALIZED — DO NOT RE-ENABLE THE OLD BODY ⚠️
--
-- This migration originally consolidated habit tracking into `habit_logs` and
-- DROPPED `habit_completions`. That is unsafe: the live database and the entire
-- frontend (src/context/DashboardContext.tsx) use `habit_completions` as the
-- canonical habit-tracking table. Running the old body would drop the table the
-- app depends on and cause silent data loss.
--
-- Decision (2026-07): `habit_completions` is canonical. `habit_logs` (created in
-- 001) is unused and left in place harmlessly. The reproducible, non-destructive
-- definition of `habit_completions` now lives in 005_reconcile_live_schema.sql.
--
-- This file is intentionally a no-op so that applying the full migration folder
-- can never drop `habit_completions`.

do $$
begin
  raise notice '002 is a no-op. habit_completions is canonical; see 005_reconcile_live_schema.sql.';
end$$;
