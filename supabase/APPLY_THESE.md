# Pending DB steps (run in Supabase SQL Editor)

⚠️ **Never run `supabase db push`.** The live schema has drifted from migrations
001–004, and a push would try to force conflicting shapes. Apply these by
pasting into **Supabase → SQL Editor → Run**. Every script is idempotent and
non-destructive, so re-running is safe.

## 1. `005_reconcile_live_schema.sql` — apply now ✅
Makes task→project links persist and makes `habit_completions` reproducible
(RLS + realtime). No frontend changes needed; the app already uses these.

After running, verify:
- Assign a task to a project, reload → the assignment sticks.
- Toggle a habit, reload → it stays toggled (this already worked; just confirming
  RLS/realtime are intact).

## 2. `006_physical_activity.sql` — apply to turn on PhysicalActivity sync ✅
Creates `physique_entries`, `workout_routines`, `workout_log_days`.

The frontend is already wired (`usePhysique`, `usePhysical`) with an offline-first
fallback: before you run this, the app keeps using localStorage and the remote
calls silently no-op; after you run it, the same actions sync to Supabase.

After running, test (open DevTools → Network to watch the calls):
1. Import a workout routine → check `workout_routines` has one `is_active` row.
2. Mark today's workout done, reload → still done; `workout_log_days` has the row.
3. Undo it → the row is deleted (or, if the day has a photo or a per-day edit,
   kept with `confirmed = false` so that work isn't thrown away).
4. Log a Check-in photo → a row appears in `physique_entries`.
5. Open the app in a second browser/device → your routine, log, and photos load.

If anything errors, check the Supabase logs and RLS policies (the script sets
owner-only policies; a zero-policy table silently blocks all access).

## 3. `008_task_completed_at.sql` — apply to turn on done-task expiry ✅
Adds `tasks.completed_at`, backfills existing done rows to `now()`, and indexes it.

The frontend deletes done tasks 3 weeks after `completed_at`. Rows with a NULL
`completed_at` are never deleted, which is why the backfill matters: without it
your existing done tasks would sit there forever. With it, they all start a
fresh 3-week clock from the moment you run the script.

Marking a task done still persists if you *don't* run this — the update retries
without the column — but nothing will ever expire.

⚠️ This app stores "done" as the DB's `backlog` status. Anything parked in
`backlog` that you think of as "not done, just later" will also be deleted after
3 weeks. Move those out before running.

After running, test:
1. Mark a task done → `tasks.completed_at` is set on that row.
2. Un-check it → `completed_at` goes back to NULL.
3. Hand-set a done task's `completed_at` to 30 days ago, reload the app → the
   task is gone from the list and the row is deleted.

## 4. `009_workout_day_overrides.sql` — apply for per-day workout edits ✅
Adds `name` + `exercises` to `workout_log_days` so a single day can deviate from
the routine without rewriting it.

Same offline-first fallback as 006: before you run it, the upsert retries without
those columns, so completions and photos still sync and per-day edits just stay
in that browser's localStorage. After you run it, edits sync across devices.

After running, test:
1. Edit today's workout on the Fitness page → `workout_log_days` has the row with
   `name` set.
2. Edit a *future* day in the calendar → a row appears with `confirmed = false`.
3. Hit "Use routine" on that day → the override clears (row deleted if the day
   had no photo and wasn't confirmed).

## 5. `010_academic_plans.sql` — apply to sync the Academics planner ✅
Creates `academic_plans`: one row per user holding the whole planner document
(the three graduation plans, their semesters, and the courses in them) as jsonb.

Same offline-first fallback as 006: before you run it, the Academics tab keeps
everything in that browser's localStorage and the remote calls silently no-op;
after you run it, the same edits sync across devices. Writes are debounced ~600ms
so typing in the course editor doesn't hammer the table.

After running, test:
1. Open **Academics**, edit a course code → `academic_plans` has one row for you
   and its `data` reflects the edit.
2. Switch plans (Sprint / Balanced / Internship-first), reload → the plan you
   left active is still active.
3. Open the app in a second browser/device → the same plans load.
4. Hit **Reset** on a plan → it returns to the seeded version and syncs.

## 6. `011_dashboard_mantra.sql` — apply to sync the dashboard quote ✅
Creates `dashboard_mantra`: one row per user holding `{ text, author }` for the
quote pinned above the greeting.

Same offline-first fallback as 006: before you run it the quote lives in that
browser's localStorage and the remote calls silently no-op; after you run it the
same quote follows you across devices.

After running, test:
1. Click the quote on the dashboard, type something, hit **Save** →
   `dashboard_mantra` has one row for you with your text in `data`.
2. Reload → the quote is still there.
3. Open the app in a second browser/device → the same quote loads.

## Not migrating (intentionally staying local)
- `MealPlan` and `Settings` localStorage: meal-plan template + UI prefs. Fine to
  keep device-local.
- `Health` / `Finance` cards: these are empty-state placeholders, not localStorage
  data. They light up when the wearable / Google Sheets integrations are built.
