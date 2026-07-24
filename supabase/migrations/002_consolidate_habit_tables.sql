-- Consolidate habit tracking into habit_logs (canonical schema).
-- Migrates any habit_completions data into habit_logs, then drops habit_completions.
-- Halts with an exception if both tables have data so the conflict can be reviewed.

do $$
declare
  has_completions   boolean;
  logs_count        bigint;
  completions_count bigint;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'habit_completions'
  ) into has_completions;

  if not has_completions then
    raise notice 'habit_completions does not exist — nothing to consolidate.';
    return;
  end if;

  select count(*) from public.habit_logs        into logs_count;
  select count(*) from public.habit_completions into completions_count;

  raise notice 'habit_logs=%, habit_completions=%', logs_count, completions_count;

  if logs_count > 0 and completions_count > 0 then
    raise exception
      'Both tables have data (habit_logs=%, habit_completions=%). Halting — resolve manually before re-running.',
      logs_count, completions_count;
  end if;

  if completions_count > 0 then
    insert into public.habit_logs (id, user_id, habit_id, date, completed_subtasks, is_complete)
    select
      id,
      user_id,
      habit_id,
      completed_date,
      coalesce(completed_subtasks, '[]'::jsonb),
      coalesce(fully_completed, false)
    from public.habit_completions;
    raise notice 'Migrated % rows from habit_completions to habit_logs', completions_count;
  end if;

  drop table public.habit_completions;
  raise notice 'Dropped habit_completions';
end$$;
