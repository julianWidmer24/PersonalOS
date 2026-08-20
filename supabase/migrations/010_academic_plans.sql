-- 010 — Academic course planner (Academics tab).
--
-- One row per user holding the whole planner document: the three graduation
-- plans, their semesters, and the courses in them. It's a small, always-read-
-- and-written-whole blob, so a jsonb column beats a table per level.
--
-- The frontend (useAcademics) is offline-first: localStorage is the synchronous
-- cache and this table is the cross-device store. If the table is missing the
-- remote calls simply no-op and the planner keeps working locally, so applying
-- this is optional but recommended.
--
-- NON-DESTRUCTIVE and idempotent. Apply via Supabase → SQL Editor → Run.

create table if not exists public.academic_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  data       jsonb not null default '{}',   -- { plans: GradPlan[], activePlanId }
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists academic_plans_user_idx on public.academic_plans (user_id);

alter table public.academic_plans enable row level security;
drop policy if exists "academic_plans: own rows"   on public.academic_plans;
create policy "academic_plans: own rows"   on public.academic_plans using (auth.uid() = user_id);
drop policy if exists "academic_plans: insert own" on public.academic_plans;
create policy "academic_plans: insert own" on public.academic_plans for insert with check (auth.uid() = user_id);
drop policy if exists "academic_plans: update own" on public.academic_plans;
create policy "academic_plans: update own" on public.academic_plans for update using (auth.uid() = user_id);
drop policy if exists "academic_plans: delete own" on public.academic_plans;
create policy "academic_plans: delete own" on public.academic_plans for delete using (auth.uid() = user_id);

comment on column public.academic_plans.data is
  'Whole planner document: { plans: [{ id, name, gradTerm, blurb, unitCap, semesters:[{ id, season, year, kind, unitCap, note, courses:[{ id, code, title, units, status, grade, reqs[], note, banked }] }] }], activePlanId }';
