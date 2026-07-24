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
3. Undo it → the row is deleted.
4. Log a Check-in photo → a row appears in `physique_entries`.
5. Open the app in a second browser/device → your routine, log, and photos load.

If anything errors, check the Supabase logs and RLS policies (the script sets
owner-only policies; a zero-policy table silently blocks all access).

## Not migrating (intentionally staying local)
- `MealPlan` and `Settings` localStorage: meal-plan template + UI prefs. Fine to
  keep device-local.
- `Health` / `Finance` cards: these are empty-state placeholders, not localStorage
  data. They light up when the wearable / Google Sheets integrations are built.
