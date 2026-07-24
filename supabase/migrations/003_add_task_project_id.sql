-- Link tasks to projects so assignments survive reload.
-- The frontend tolerates this column being absent (assignment stays UI-only
-- and logs a console error), so this can be applied independently.

alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists tasks_project_id_idx on public.tasks (project_id);
