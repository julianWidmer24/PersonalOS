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

## 2. `006_physical_activity.sql` — apply only when wiring PhysicalActivity ⏳
Creates `physique_entries`, `workout_routines`, `workout_log_days` for moving
workouts/physique off localStorage. The frontend hooks (`usePhysique`,
`usePhysical`) still need to be migrated to read/write these — that's the next
coding task. Until then these tables sit empty and nothing breaks.

## Not migrating (intentionally staying local)
- `MealPlan` and `Settings` localStorage: meal-plan template + UI prefs. Fine to
  keep device-local.
- `Health` / `Finance` cards: these are empty-state placeholders, not localStorage
  data. They light up when the wearable / Google Sheets integrations are built.
