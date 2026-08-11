-- 009 — Per-day workout overrides.
--
-- A day's workout is normally derived by cycling through the active routine
-- (workout_routines.workouts) by day index. These columns let a single day
-- deviate — renamed, different exercises, or swapped for another session —
-- without rewriting the routine that every other day inherits from.
--
-- NULL name/exercises means "no override, use the routine's suggestion".
-- Rows may now exist with confirmed = false: a planned-but-not-yet-done day
-- (e.g. an edited future workout) is a legitimate row.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

alter table public.workout_log_days
  add column if not exists name text;

alter table public.workout_log_days
  add column if not exists exercises jsonb;

-- `confirmed` previously defaulted true because every row was a completed day.
-- Planned days are now written explicitly with confirmed = false; the default
-- stays true so existing inserts keep their meaning.
comment on column public.workout_log_days.name is
  'Per-day override of the routine workout name; null = inherit from routine.';
comment on column public.workout_log_days.exercises is
  'Per-day override of the exercise list (jsonb array of text); null = inherit.';
