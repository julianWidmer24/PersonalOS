import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Project, Habit, JournalEntry, Goal, ModalState } from '../types';
import { supabase } from '../lib/supabase';
import { celebrate } from '../lib/celebrate';
import { taskElapsedMs } from '../lib/dashboardHelpers';

// Pure helpers (fmt, TAG_COLORS, PRIORITY_COLORS, useClock) now live in
// ../lib/dashboardHelpers so this file only exports components + its hook.

// ── Date helpers ──────────────────────────────────────────────
// Local-date key (YYYY-MM-DD). Deliberately not toISOString(): that converts to
// UTC first, so an evening check-in west of UTC — or a pre-dawn one east of it —
// lands on the neighbouring day's key and silently breaks the streak.
function dateStr(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
const todayStr = () => dateStr(new Date());
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

// ── Tasks: Supabase ↔ frontend mappers ────────────────────────
function priorityFromScore(score: number): Task['priority'] {
  if (score >= 4) return 'P0';
  if (score >= 2) return 'P1';
  return 'P2';
}
function priorityToScore(p: Task['priority']): number {
  if (p === 'P0') return 5;
  if (p === 'P1') return 3;
  return 1;
}
function tagFromCategory(cat: string | null): Task['tag'] {
  const map: Record<string, Task['tag']> = {
    academic: 'course', internship: 'career', health: 'health',
    finance: 'personal', personal: 'personal', content: 'personal', networking: 'career',
    course: 'course', career: 'career',
  };
  return map[cat ?? ''] ?? 'personal';
}
function tagToCategory(tag: Task['tag']): string {
  const map: Record<string, string> = {
    course: 'academic', career: 'internship', health: 'health', personal: 'personal',
  };
  return map[tag] ?? 'personal';
}

const STATUS_TO_DB: Record<string, string> = {
  now:   'today',
  next:  'this_week',
  later: 'this_month',
  done:  'backlog',
};
const STATUS_FROM_DB: Record<string, Task['status']> = {
  today:      'now',
  this_week:  'next',
  this_month: 'later',
  // 'done' is persisted as the DB's 'backlog' bucket (the schema has no
  // dedicated done state), so map it back to 'done' — not 'later' — on reload.
  backlog:    'done',
};

// ── Done-task expiry ──────────────────────────────────────────
// A task marked done is hard-deleted a day later. `completed_at` (migration
// 008) is the clock; rows without one are left alone.
const DONE_TTL_MS = 24 * 60 * 60 * 1000;
const DONE_DB_STATUS = STATUS_TO_DB.done;

// Bounds on how long the app waits before re-checking for expired tasks.
const MIN_PURGE_GAP_MS = 60 * 1000;
const MAX_PURGE_GAP_MS = 60 * 60 * 1000;
const clampPurgeWait = (ms: number) =>
  Math.min(Math.max(ms, MIN_PURGE_GAP_MS), MAX_PURGE_GAP_MS);

const isExpiredDone = (row: { status?: string; completed_at?: string | null }) =>
  row.status === DONE_DB_STATUS &&
  !!row.completed_at &&
  Date.now() - new Date(row.completed_at).getTime() > DONE_TTL_MS;

async function purgeExpiredDoneTasks() {
  const cutoff = new Date(Date.now() - DONE_TTL_MS).toISOString();
  const { error } = await supabase.from('tasks').delete()
    .eq('status', DONE_DB_STATUS)
    .lt('completed_at', cutoff);
  // Most likely cause of failure: migration 008 hasn't been applied yet.
  if (error) console.error('purge expired done tasks error:', error);
}

// Columns added by a migration the live DB may not have run yet (008, 012/013).
// A patch touching one is retried without it, so the rest of the change still
// persists — the task just doesn't age out / keep its stopwatch across devices.
const OPTIONAL_TASK_COLUMNS = ['completed_at', 'started_at', 'time_spent_ms'];

// Optional columns the DB has told us it doesn't have. Only a column the error
// names lands here, so one missing migration (say 008) can't take the stopwatch
// columns down with it, and a network blip never disables a column for good.
const missingTaskColumns = new Set<string>();

async function patchTaskRow(id: string, patch: Record<string, unknown>) {
  const body = { ...patch };
  missingTaskColumns.forEach(c => delete body[c]);
  for (;;) {
    if (!Object.keys(body).length) return null;
    const { error } = await supabase.from('tasks').update(body).eq('id', id);
    if (!error) return null;
    const optional = OPTIONAL_TASK_COLUMNS.filter(c => c in body);
    if (!optional.length) return error;
    const named = optional.filter(c => error.message?.includes(c));
    named.forEach(c => missingTaskColumns.add(c));
    // An error that names none of them may still be about one (older PostgREST
    // wording) — retry without all of them rather than lose the whole patch.
    (named.length ? named : optional).forEach(c => delete body[c]);
    if (!Object.keys(body).length) return error;
  }
}

// tasks.due_date is a real date column — only send it something it can store.
const toDueDate = (due?: string) => (due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): Task {
  return {
    id:        row.id,
    title:     row.title,
    tag:       tagFromCategory(row.category),
    priority:  priorityFromScore(row.priority ?? 2),
    status:    STATUS_FROM_DB[row.status] ?? 'now',
    due:       row.due_date ? String(row.due_date) : '—',
    est:       '—',
    projectId: row.project_id ?? null,
    isStarred: row.starred ?? false,
    startedAt: row.started_at ? String(row.started_at) : null,
    timeSpentMs: Number(row.time_spent_ms ?? 0) || 0,
  };
}

/** The DB columns that change when a task goes from `before` to `after`. */
function taskDbDiff(before: Task, after: Task): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (after.title !== before.title) db.title = after.title;
  if (after.tag !== before.tag) db.category = tagToCategory(after.tag);
  if (after.priority !== before.priority) db.priority = priorityToScore(after.priority);
  if (after.status !== before.status) {
    db.status = STATUS_TO_DB[after.status] ?? after.status;
    db.completed_at = after.status === 'done' ? new Date().toISOString() : null;
  }
  if (!!after.isStarred !== !!before.isStarred) db.starred = !!after.isStarred;
  if (after.due !== before.due) db.due_date = toDueDate(after.due);
  if (after.projectId !== before.projectId) db.project_id = after.projectId;
  if ((after.startedAt ?? null) !== (before.startedAt ?? null)) db.started_at = after.startedAt ?? null;
  if ((after.timeSpentMs ?? 0) !== (before.timeSpentMs ?? 0)) db.time_spent_ms = Math.round(after.timeSpentMs ?? 0);
  return db;
}

/** A task's clock stopped now, with the running stint banked into its total. */
function pausedClock(t: Task): Pick<Task, 'startedAt' | 'timeSpentMs'> {
  return { startedAt: null, timeSpentMs: taskElapsedMs(t) };
}

// ── Undo / redo ───────────────────────────────────────────────
interface HistoryEntry {
  label: string;
  undo: () => void;
  redo: () => void;
}
/** What just happened to the history, for the toast to announce. */
export interface HistoryEvent {
  kind: 'did' | 'undid' | 'redid';
  label: string;
  /** Distinguishes two identical events in a row. */
  seq: number;
}
const HISTORY_LIMIT = 50;

// ── Habits: derive done/hist/streak from completions ──────────
// How far back completions are fetched — and therefore the longest streak that
// can be proven. The derive loop below never counts past this, so a streak can
// only ever be under-reported, never invented.
const COMPLETION_WINDOW_DAYS = 400;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveHabit(habitRow: any, completionsForHabit: any[]): Habit {
  const completedDays = new Set(
    completionsForHabit
      .filter(c => c.fully_completed)
      .map(c => String(c.completed_date)),
  );

  // hist: last 7 days, oldest → newest, '1' for completed
  const histChars: string[] = [];
  for (let i = 6; i >= 0; i--) {
    histChars.push(completedDays.has(daysAgoStr(i)) ? '1' : '0');
  }

  // streak: consecutive completed days back from today. Today counts only once
  // it's actually checked — but an unchecked today is still in progress, so it
  // doesn't break the run; we start counting at yesterday instead.
  const doneToday = completedDays.has(todayStr());
  let streak = 0;
  for (let i = doneToday ? 0 : 1; i < COMPLETION_WINDOW_DAYS; i++) {
    if (completedDays.has(daysAgoStr(i))) streak++;
    else break;
  }

  return {
    id:     habitRow.id,
    name:   habitRow.name,
    icon:   '◇',
    hist:   histChars.join(''),
    streak,
    done:   doneToday,
  };
}

// ── Goals mappers ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToGoal(row: any): Goal {
  const tf = row.timeframe as string | null;
  const safeTf: Goal['timeframe'] =
    tf === 'week' || tf === 'month' || tf === 'semester' || tf === 'year' ? tf : 'month';
  return {
    id:         row.id,
    title:      row.title,
    progress:   typeof row.progress === 'number' ? row.progress : Number(row.progress ?? 0),
    target:     row.target ?? '—',
    cadence:    row.cadence ?? '—',
    metric:     row.metric ?? '—',
    kind:       row.kind ?? 'personal',
    timeframe:  safeTf,
    isComplete: row.status === 'completed',
  };
}

// ── Journal mappers ───────────────────────────────────────────
function moodFromScore(score: number | null | undefined): string {
  if (score == null) return 'neutral';
  if (score >= 8) return 'grateful';
  if (score >= 6) return 'focused';
  if (score >= 4) return 'neutral';
  if (score >= 2) return 'tired';
  return 'restless';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToJournal(row: any): JournalEntry {
  return {
    id:      row.id,
    date:    String(row.entry_date ?? todayStr()),
    mood:    moodFromScore(row.mood_score),
    excerpt: row.summary ?? row.transcript ?? '',
  };
}

// ── Projects mappers ──────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(row: any): Project {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description ?? '',
    color:       row.color ?? '#93c5fd',
    due:         row.due_date ?? '—',
    status:      (row.status ?? 'active') as Project['status'],
  };
}

// ── DashboardContext ──────────────────────────────────────────
interface DashboardApi {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  journal: JournalEntry[];
  setJournal: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  goals: Goal[];
  modal: ModalState;
  setModal: (m: ModalState) => void;

  toggleTask: (id: string) => void;
  starTask: (id: string) => void;
  /** Start a task's stopwatch, or pause it — keeping the time it's tracked. */
  toggleTaskProgress: (id: string) => void;
  toggleHabit: (id: string) => void;
  reorderTasks: (next: Task[]) => void;
  addTask: (data: Partial<Task>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addJournal: (text: string) => void;

  addHabit: (data: Partial<Habit>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;

  addProject: (data: Partial<Project>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  assignTask: (taskId: string, projectId: string | null) => void;

  addGoal: (data: Partial<Goal>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  toggleGoal: (id: string) => void;

  /** Reverse the most recent undoable action (⌘/Ctrl+Z). */
  undo: () => void;
  /** Re-apply the most recently undone action (⌘/Ctrl+Y, ⌘/Ctrl+Shift+Z). */
  redo: () => void;
  undoLabel: string | null;
  redoLabel: string | null;
  lastHistoryEvent: HistoryEvent | null;
}

const DashCtx = createContext<DashboardApi | null>(null);

export function DashProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [habits, setHabits]     = useState<Habit[]>([]);
  const [journal, setJournal]   = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [modal, setModal]       = useState<ModalState>(null);

  // Cached user_id for inserts (RLS check requires explicit user_id)
  const userIdRef = useRef<string | null>(null);
  // Latest tasks, readable from a callback without putting `tasks` in its deps.
  // Used to tell "was this already done?" apart from "is being finished now",
  // which has to happen outside the setTasks updater: StrictMode invokes those
  // twice in dev, and a celebration that fires twice is a bug you can see.
  const tasksRef = useRef<Task[]>([]);
  // A task added in this tab has a temporary id until its insert returns; an
  // undo recorded against it resolves through here to the real row id.
  const taskIdAliasRef = useRef(new Map<string, string>());
  // Optimistic tasks whose add was undone before the insert came back.
  const cancelledAddsRef = useRef(new Set<string>());

  // Undo/redo stacks. Entries close over ids and field snapshots, never over
  // state, so replaying one always acts on the latest version of the data.
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const [historyLabels, setHistoryLabels] = useState<{ undo: string | null; redo: string | null }>({ undo: null, redo: null });
  const [lastHistoryEvent, setLastHistoryEvent] = useState<HistoryEvent | null>(null);
  const historySeqRef = useRef(0);

  const syncHistory = useCallback((kind: HistoryEvent['kind'] | null, label?: string) => {
    const u = undoStackRef.current, r = redoStackRef.current;
    setHistoryLabels({ undo: u[u.length - 1]?.label ?? null, redo: r[r.length - 1]?.label ?? null });
    if (kind && label) setLastHistoryEvent({ kind, label, seq: ++historySeqRef.current });
  }, []);

  const record = useCallback((entry: HistoryEntry) => {
    undoStackRef.current = [...undoStackRef.current, entry].slice(-HISTORY_LIMIT);
    redoStackRef.current = [];
    syncHistory('did', entry.label);
  }, [syncHistory]);

  const undo = useCallback(() => {
    const entry = undoStackRef.current[undoStackRef.current.length - 1];
    if (!entry) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, entry];
    entry.undo();
    syncHistory('undid', entry.label);
  }, [syncHistory]);

  const redo = useCallback(() => {
    const entry = redoStackRef.current[redoStackRef.current.length - 1];
    if (!entry) return;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, entry];
    entry.redo();
    syncHistory('redid', entry.label);
  }, [syncHistory]);
  // Raw habit rows + completion rows, kept so we can re-derive Habit objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitRowsRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completionRowsRef = useRef<any[]>([]);

  const recomputeHabits = useCallback(() => {
    const byHabit = new Map<string, typeof completionRowsRef.current>();
    for (const c of completionRowsRef.current) {
      const arr = byHabit.get(c.habit_id) ?? [];
      arr.push(c);
      byHabit.set(c.habit_id, arr);
    }
    setHabits(
      habitRowsRef.current
        .filter(h => h.active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(h => deriveHabit(h, byHabit.get(h.id) ?? [])),
    );
  }, []);

  // ── Load tasks + realtime ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user?.id ?? null;
    });

    // Each done task leaves on its own clock, so instead of sweeping on a fixed
    // interval — which would let a task finished at noon linger until the next
    // tick — wake exactly when the oldest one crosses its day.
    let purgeTimer: ReturnType<typeof setTimeout> | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheduleNextPurge = (live: any[]) => {
      const due = live
        .filter(r => r.status === DONE_DB_STATUS && r.completed_at)
        .map(r => new Date(r.completed_at).getTime() + DONE_TTL_MS);

      // `live` has already had expired rows filtered out, so every due time is
      // in the future. The ceiling keeps a long-lived tab honest across sleep
      // and clock changes; the floor means a row the delete can't remove (no
      // migration 008) costs one query a minute, not a spin.
      const wait = due.length ? Math.min(...due) - Date.now() : MAX_PURGE_GAP_MS;
      purgeTimer = setTimeout(loadTasks, clampPurgeWait(wait));
    };

    // Purge first so expired done tasks never make it into the fetch; the
    // local filter is a backstop for when the delete fails (e.g. no migration).
    const loadTasks = async () => {
      clearTimeout(purgeTimer);
      await purgeExpiredDoneTasks();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('archived', false)
        .in('status', ['today', 'this_week', 'this_month', 'backlog'])
        .order('created_at', { ascending: false });
      if (error) {
        console.error('tasks fetch error:', error);
        scheduleNextPurge([]);
        return;
      }
      const live = (data ?? []).filter(row => !isExpiredDone(row));
      setTasks(live.map(rowToTask));
      scheduleNextPurge(live);
    };
    loadTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks(ts => {
            if (ts.some(t => t.id === payload.new.id)) return ts;
            return [rowToTask(payload.new), ...ts];
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          // Archiving is how a task is deleted (and un-archiving how an undo
          // brings it back), so an UPDATE can add or remove it from the list.
          const row = payload.new;
          setTasks(ts => {
            if (row.archived || isExpiredDone(row)) return ts.filter(t => t.id !== row.id);
            if (!ts.some(t => t.id === row.id)) return [rowToTask(row), ...ts];
            return ts.map(t => t.id === row.id ? rowToTask(row) : t);
          });
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks(ts => ts.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { clearTimeout(purgeTimer); supabase.removeChannel(channel); };
  }, []);

  // ── Load habits + habit_completions + realtime ────────────
  useEffect(() => {
    const since = daysAgoStr(COMPLETION_WINDOW_DAYS);

    Promise.all([
      supabase.from('habits').select('*').order('sort_order', { ascending: true }),
      supabase.from('habit_completions').select('*').gte('completed_date', since),
    ]).then(([hRes, cRes]) => {
      if (hRes.error) console.error('habits fetch error:', hRes.error);
      if (cRes.error) console.error('habit_completions fetch error:', cRes.error);
      habitRowsRef.current = hRes.data ?? [];
      completionRowsRef.current = cRes.data ?? [];
      recomputeHabits();
    });

    const channel = supabase
      .channel('habits-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            habitRowsRef.current = [...habitRowsRef.current, payload.new];
          } else if (payload.eventType === 'UPDATE') {
            habitRowsRef.current = habitRowsRef.current.map(h => h.id === payload.new.id ? payload.new : h);
          } else if (payload.eventType === 'DELETE') {
            habitRowsRef.current = habitRowsRef.current.filter(h => h.id !== payload.old.id);
          }
          recomputeHabits();
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            completionRowsRef.current = [...completionRowsRef.current, payload.new];
          } else if (payload.eventType === 'UPDATE') {
            completionRowsRef.current = completionRowsRef.current.map(c => c.id === payload.new.id ? payload.new : c);
          } else if (payload.eventType === 'DELETE') {
            completionRowsRef.current = completionRowsRef.current.filter(c => c.id !== payload.old.id);
          }
          recomputeHabits();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [recomputeHabits]);

  // ── Load goals + realtime ─────────────────────────────────
  useEffect(() => {
    supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('goals fetch error:', error); return; }
        setGoals((data ?? []).map(rowToGoal));
      });

    const channel = supabase
      .channel('goals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'goals' },
        (payload) => {
          setGoals(gs => gs.some(g => g.id === payload.new.id) ? gs : [rowToGoal(payload.new), ...gs]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'goals' },
        (payload) => {
          setGoals(gs => gs.map(g => g.id === payload.new.id ? rowToGoal(payload.new) : g));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'goals' },
        (payload) => {
          setGoals(gs => gs.filter(g => g.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Load journal_entries + realtime ───────────────────────
  useEffect(() => {
    supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) { console.error('journal fetch error:', error); return; }
        setJournal((data ?? []).map(rowToJournal));
      });

    const channel = supabase
      .channel('journal-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'journal_entries' },
        (payload) => {
          setJournal(js => js.some(j => j.id === payload.new.id) ? js : [rowToJournal(payload.new), ...js]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'journal_entries' },
        (payload) => {
          setJournal(js => js.map(j => j.id === payload.new.id ? rowToJournal(payload.new) : j));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'journal_entries' },
        (payload) => {
          setJournal(js => js.filter(j => j.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Load projects + realtime ──────────────────────────────
  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('projects fetch error:', error); return; }
        setProjects((data ?? []).map(rowToProject));
      });

    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects(ps => ps.some(p => p.id === payload.new.id) ? ps : [rowToProject(payload.new), ...ps]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects(ps => ps.map(p => p.id === payload.new.id ? rowToProject(payload.new) : p));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects(ps => ps.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // ── Task mutations ────────────────────────────────────────
  // Every task edit funnels through here: merge the fields into the latest copy
  // of the task, then persist only the columns that actually changed. Side
  // effects stay out of setTasks updaters, which StrictMode runs twice.
  const applyTaskFields = useCallback((rawId: string, fields: Partial<Task>, context: string) => {
    const id = taskIdAliasRef.current.get(rawId) ?? rawId;
    const before = tasksRef.current.find(t => t.id === id);
    if (!before) return;
    const after = { ...before, ...fields };
    tasksRef.current = tasksRef.current.map(t => t.id === id ? after : t);
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...fields } : t));
    const dbPatch = taskDbDiff(before, after);
    if (!Object.keys(dbPatch).length) return;
    patchTaskRow(id, { ...dbPatch, updated_at: new Date().toISOString() })
      .then(error => { if (error) console.error(`${context} error:`, error); });
  }, []);

  /** Apply a change to a task and put it on the undo stack under `label`. */
  const changeTask = useCallback((id: string, patch: Partial<Task>, label: string, context: string) => {
    const before = tasksRef.current.find(t => t.id === id);
    if (!before) return;
    const keys = (Object.keys(patch) as (keyof Task)[]).filter(k => patch[k] !== before[k]);
    if (!keys.length) return;
    const prev = Object.fromEntries(keys.map(k => [k, before[k]])) as Partial<Task>;
    const next = Object.fromEntries(keys.map(k => [k, patch[k]])) as Partial<Task>;
    applyTaskFields(id, next, context);
    record({
      label,
      undo: () => applyTaskFields(id, prev, `undo ${context}`),
      redo: () => applyTaskFields(id, next, `redo ${context}`),
    });
  }, [applyTaskFields, record]);

  const toggleTask = useCallback((id: string) => {
    const t = tasksRef.current.find(x => x.id === id);
    if (!t) return;
    if (t.status === 'done') {
      changeTask(id, { status: 'now' }, `Reopened “${t.title}”`, 'toggleTask');
      return;
    }
    celebrate();
    // Finishing a task pauses its stopwatch, banking the time it ran. Undo
    // restores the original clock, so an accidental "done" loses nothing.
    changeTask(id, { status: 'done', ...pausedClock(t) }, `Marked “${t.title}” done`, 'toggleTask');
  }, [changeTask]);

  const starTask = useCallback((id: string) => {
    const t = tasksRef.current.find(x => x.id === id);
    if (!t) return;
    changeTask(id, { isStarred: !t.isStarred }, t.isStarred ? `Unstarred “${t.title}”` : `Starred “${t.title}”`, 'starTask');
  }, [changeTask]);

  // Starting a task stamps the moment it began; the stopwatch counts from that
  // timestamp rather than from a local tick, so it survives reloads and reads
  // the same on every device. Pausing banks the stint into timeSpentMs, so the
  // next start picks the total up where it left off.
  const toggleTaskProgress = useCallback((id: string) => {
    const t = tasksRef.current.find(x => x.id === id);
    if (!t) return;
    if (t.startedAt) changeTask(id, pausedClock(t), `Paused “${t.title}”`, 'toggleTaskProgress');
    else changeTask(id, { startedAt: new Date().toISOString() }, `Started “${t.title}”`, 'toggleTaskProgress');
  }, [changeTask]);

  const reorderTasks = useCallback((next: Task[]) => setTasks(next), []);

  // Adding again after an undo: the row was archived, not deleted, so bring
  // that same row back rather than inserting a duplicate.
  const restoreTask = useCallback((snapshot: Task, context: string) => {
    const id = taskIdAliasRef.current.get(snapshot.id) ?? snapshot.id;
    cancelledAddsRef.current.delete(id);
    const restored = { ...snapshot, id };
    if (!tasksRef.current.some(t => t.id === id)) {
      tasksRef.current = [restored, ...tasksRef.current];
      setTasks(ts => ts.some(t => t.id === id) ? ts : [restored, ...ts]);
    }
    if (id.startsWith('tmp-task-')) return; // insert still in flight
    supabase.from('tasks').update({ archived: false }).eq('id', id).then(({ error }) => {
      if (error) console.error(`${context} error:`, error);
    });
  }, []);

  const archiveTask = useCallback((rawId: string, context: string) => {
    const id = taskIdAliasRef.current.get(rawId) ?? rawId;
    tasksRef.current = tasksRef.current.filter(t => t.id !== id);
    setTasks(ts => ts.filter(t => t.id !== id));
    // Not inserted yet: archive it the moment the insert returns.
    if (id.startsWith('tmp-task-')) { cancelledAddsRef.current.add(id); return; }
    supabase.from('tasks').update({ archived: true }).eq('id', id).then(({ error }) => {
      if (error) console.error(`${context} error:`, error);
    });
  }, []);

  const addTask = useCallback((data: Partial<Task>) => {
    const optimisticId = 'tmp-task-' + Math.random().toString(36).slice(2, 10);
    const optimistic: Task = {
      id: optimisticId,
      status: 'now', priority: 'P1', tag: 'personal', est: '—', due: '—', projectId: null,
      title: '', isStarred: false,
      ...data,
    };
    tasksRef.current = [optimistic, ...tasksRef.current];
    setTasks(ts => [optimistic, ...ts]);
    record({
      label: `Added “${optimistic.title}”`,
      undo: () => archiveTask(optimisticId, 'undo addTask'),
      redo: () => restoreTask(optimistic, 'redo addTask'),
    });
    const payload: Record<string, unknown> = {
      user_id:  userIdRef.current,
      title:    optimistic.title,
      category: tagToCategory(optimistic.tag),
      priority: priorityToScore(optimistic.priority),
      status:   STATUS_TO_DB[optimistic.status] ?? optimistic.status,
      starred:  optimistic.isStarred ?? false,
      due_date: toDueDate(optimistic.due),
    };
    if (optimistic.projectId) payload.project_id = optimistic.projectId;
    const insert = (p: Record<string, unknown>) => supabase.from('tasks').insert(p).select().single();
    insert(payload).then(async ({ data: row, error }) => {
      if (error && payload.project_id) {
        // Tolerate a DB without the project_id column (migration 003 not applied)
        console.error('addTask with project_id failed, retrying without:', error);
        delete payload.project_id;
        ({ data: row, error } = await insert(payload));
      }
      if (error) {
        console.error('addTask error:', error);
        tasksRef.current = tasksRef.current.filter(t => t.id !== optimisticId);
        setTasks(ts => ts.filter(t => t.id !== optimisticId));
        return;
      }
      taskIdAliasRef.current.set(optimisticId, row.id);
      if (cancelledAddsRef.current.delete(optimisticId)) {
        // Undone while the insert was in flight — archive the row it made, and
        // move a pending redo onto the real id.
        supabase.from('tasks').update({ archived: true }).eq('id', row.id).then(({ error: e }) => {
          if (e) console.error('undo addTask error:', e);
        });
        setTasks(ts => ts.filter(t => t.id !== row.id));
        return;
      }
      // The insert leaves the optional stopwatch columns out (a DB without them
      // would reject the whole row), so a task started from the form gets its
      // clock written as a follow-up patch.
      const clockPatch = taskDbDiff(rowToTask(row), { ...rowToTask(row), startedAt: optimistic.startedAt, timeSpentMs: optimistic.timeSpentMs });
      if (Object.keys(clockPatch).length) {
        patchTaskRow(row.id, clockPatch).then(e => { if (e) console.error('addTask clock error:', e); });
      }
      const real = { ...rowToTask(row), startedAt: optimistic.startedAt ?? null, timeSpentMs: optimistic.timeSpentMs ?? 0 };
      tasksRef.current = tasksRef.current.map(t => t.id === optimisticId ? real : t);
      // Realtime may have delivered the INSERT first; don't list it twice.
      setTasks(ts => ts.filter(t => t.id !== real.id).map(t => t.id === optimisticId ? real : t));
    });
  }, [record, archiveTask, restoreTask]);

  const updateTask = useCallback((id: string, raw: Partial<Task>) => {
    const before = tasksRef.current.find(t => t.id === id);
    if (!before) return;
    // Moving a task to done stops its stopwatch, however it got there, banking
    // the time it ran — unless the caller is setting the clock itself.
    const finishing = raw.status === 'done' && before.status !== 'done';
    const patch: Partial<Task> =
      finishing && raw.startedAt === undefined ? { ...raw, ...pausedClock(before) } : raw;
    if (finishing) celebrate();
    const label = finishing
      ? `Marked “${before.title}” done`
      : raw.status && raw.status !== before.status && Object.keys(raw).length === 1
        ? `Moved “${before.title}”`
        : `Edited “${before.title}”`;
    changeTask(id, patch, label, 'updateTask');
  }, [changeTask]);

  const removeTask = useCallback((id: string) => {
    const snapshot = tasksRef.current.find(t => t.id === id);
    if (!snapshot) return;
    archiveTask(id, 'removeTask');
    record({
      label: `Deleted “${snapshot.title}”`,
      undo: () => restoreTask(snapshot, 'undo removeTask'),
      redo: () => archiveTask(snapshot.id, 'redo removeTask'),
    });
  }, [archiveTask, restoreTask, record]);

  // ── Habit mutations ───────────────────────────────────────
  const toggleHabitRaw = useCallback((id: string) => {
    const today = todayStr();
    const existing = completionRowsRef.current.find(
      c => c.habit_id === id && String(c.completed_date) === today,
    );
    const nextCompleted = !(existing?.fully_completed ?? false);

    if (existing) {
      supabase.from('habit_completions')
        .update({ fully_completed: nextCompleted })
        .eq('id', existing.id)
        .then(({ error }) => { if (error) console.error('toggleHabit update error:', error); });
      completionRowsRef.current = completionRowsRef.current.map(c =>
        c.id === existing.id ? { ...c, fully_completed: nextCompleted } : c,
      );
    } else {
      const optimistic = {
        id: 'tmp-' + Math.random().toString(36).slice(2),
        user_id: userIdRef.current,
        habit_id: id,
        completed_date: today,
        completed_subtasks: [],
        fully_completed: nextCompleted,
      };
      completionRowsRef.current = [...completionRowsRef.current, optimistic];
      supabase.from('habit_completions').insert({
        user_id: userIdRef.current,
        habit_id: id,
        completed_date: today,
        fully_completed: nextCompleted,
      }).select().single().then(({ data, error }) => {
        if (error) {
          console.error('toggleHabit insert error:', error);
          completionRowsRef.current = completionRowsRef.current.filter(c => c.id !== optimistic.id);
          recomputeHabits();
          return;
        }
        completionRowsRef.current = completionRowsRef.current.map(c => c.id === optimistic.id ? data : c);
        recomputeHabits();
      });
    }
    recomputeHabits();
  }, [recomputeHabits]);

  // Checking a habit off is its own inverse, so undo and redo both re-toggle.
  const toggleHabit = useCallback((id: string) => {
    const habit = habitRowsRef.current.find(h => h.id === id);
    const doneToday = completionRowsRef.current.some(
      c => c.habit_id === id && String(c.completed_date) === todayStr() && c.fully_completed,
    );
    toggleHabitRaw(id);
    const name = habit?.name ?? 'habit';
    record({
      label: doneToday ? `Unchecked “${name}”` : `Checked “${name}”`,
      undo: () => toggleHabitRaw(id),
      redo: () => toggleHabitRaw(id),
    });
  }, [toggleHabitRaw, record]);

  const addHabit = useCallback((data: Partial<Habit>) => {
    const name = (data.name ?? '').trim();
    if (!name) return;
    const sortOrder = (habitRowsRef.current[habitRowsRef.current.length - 1]?.sort_order ?? 0) + 1;
    supabase.from('habits').insert({
      user_id: userIdRef.current,
      name,
      sort_order: sortOrder,
    }).select().single().then(({ data: row, error }) => {
      if (error) { console.error('addHabit error:', error); return; }
      habitRowsRef.current = [...habitRowsRef.current, row];
      recomputeHabits();
    });
  }, [recomputeHabits]);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (!Object.keys(dbPatch).length) return;
    supabase.from('habits').update(dbPatch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateHabit error:', error);
    });
    habitRowsRef.current = habitRowsRef.current.map(h => h.id === id ? { ...h, ...dbPatch } : h);
    recomputeHabits();
  }, [recomputeHabits]);

  const removeHabit = useCallback((id: string) => {
    habitRowsRef.current = habitRowsRef.current.filter(h => h.id !== id);
    recomputeHabits();
    supabase.from('habits').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('removeHabit error:', error);
    });
  }, [recomputeHabits]);

  // ── Journal mutations ─────────────────────────────────────
  // After saving, regenerate the day's summary + mood from the full transcript
  // so an older summary never hides newly appended text. Fire-and-forget:
  // the entry is already saved if this fails (e.g. classify not deployed).
  const refreshJournalSummary = useCallback(async (entryId: string, transcript: string) => {
    const { data, error } = await supabase.functions.invoke('classify', {
      body: { type: 'journal', text: transcript },
    });
    if (error || !data?.ok) { console.error('journal summary error:', error ?? data?.error); return; }
    const { summary, mood_score, tags } = data.result ?? {};
    if (typeof summary !== 'string') return;
    const patch: Record<string, unknown> = { summary };
    if (typeof mood_score === 'number') patch.mood_score = Math.min(10, Math.max(1, Math.round(mood_score)));
    if (Array.isArray(tags)) patch.tags = tags.filter((t): t is string => typeof t === 'string').slice(0, 5);
    const { data: row, error: upErr } = await supabase
      .from('journal_entries').update(patch).eq('id', entryId).select().single();
    if (upErr) { console.error('journal summary update error:', upErr); return; }
    setJournal(js => js.map(j => j.id === row.id ? rowToJournal(row) : j));
  }, []);

  // The journal_entries table has a unique constraint on (user_id, entry_date),
  // so we append to today's entry if one already exists.
  const addJournal = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const today = todayStr();
    const { data: existing, error: selErr } = await supabase
      .from('journal_entries')
      .select('id, transcript')
      .eq('entry_date', today)
      .maybeSingle();
    if (selErr) { console.error('addJournal select error:', selErr); return; }
    if (existing) {
      const merged = existing.transcript ? `${existing.transcript}\n\n${trimmed}` : trimmed;
      const { data: row, error } = await supabase
        .from('journal_entries')
        .update({ transcript: merged })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { console.error('addJournal update error:', error); return; }
      setJournal(js => js.map(j => j.id === row.id ? rowToJournal(row) : j));
      refreshJournalSummary(row.id, merged);
    } else {
      const { data: row, error } = await supabase
        .from('journal_entries')
        .insert({ user_id: userIdRef.current, transcript: trimmed, entry_date: today })
        .select()
        .single();
      if (error) { console.error('addJournal insert error:', error); return; }
      setJournal(js => js.some(j => j.id === row.id) ? js : [rowToJournal(row), ...js]);
      refreshJournalSummary(row.id, trimmed);
    }
  }, [refreshJournalSummary]);

  // ── Project mutations ─────────────────────────────────────
  const addProject = useCallback((data: Partial<Project>) => {
    const optimisticId = 'pr-tmp-' + Math.random().toString(36).slice(2);
    const optimistic: Project = {
      id: optimisticId,
      title: 'Untitled project', description: '', color: '#93c5fd', due: '—', status: 'active',
      ...data,
    } as Project;
    setProjects(ps => [optimistic, ...ps]);
    supabase.from('projects').insert({
      user_id:     userIdRef.current,
      title:       optimistic.title,
      description: optimistic.description || null,
      color:       optimistic.color,
      due_date:    optimistic.due === '—' ? null : optimistic.due,
      status:      optimistic.status,
    }).select().single().then(({ data: row, error }) => {
      if (error) {
        console.error('addProject error:', error);
        setProjects(ps => ps.filter(p => p.id !== optimisticId));
        return;
      }
      setProjects(ps => ps.map(p => p.id === optimisticId ? rowToProject(row) : p));
    });
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    const dbPatch: Record<string, unknown> = {};
    if (patch.title       !== undefined) dbPatch.title       = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description || null;
    if (patch.color       !== undefined) dbPatch.color       = patch.color;
    if (patch.due         !== undefined) dbPatch.due_date    = patch.due === '—' ? null : patch.due;
    if (patch.status      !== undefined) dbPatch.status      = patch.status;
    if (!Object.keys(dbPatch).length) return;
    supabase.from('projects').update(dbPatch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateProject error:', error);
    });
  }, []);

  const removeProject = useCallback((id: string) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    setTasks(ts => ts.map(t => t.projectId === id ? { ...t, projectId: null } : t));
    supabase.from('projects').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('removeProject error:', error);
    });
  }, []);

  const assignTask = useCallback((taskId: string, projectId: string | null) => {
    const t = tasksRef.current.find(x => x.id === taskId);
    if (!t) return;
    const label = projectId ? `Added “${t.title}” to a project` : `Unlinked “${t.title}”`;
    changeTask(taskId, { projectId }, label, 'assignTask (is the project_id migration applied?)');
  }, [changeTask]);

  // ── Goal mutations ────────────────────────────────────────
  const addGoal = useCallback((data: Partial<Goal>) => {
    const optimisticId = 'g-tmp-' + Math.random().toString(36).slice(2);
    const optimistic: Goal = {
      id: optimisticId,
      title: '', progress: 0, target: '—', cadence: '—', metric: '—',
      kind: 'personal', timeframe: 'month', isComplete: false,
      ...data,
    } as Goal;
    setGoals(gs => [optimistic, ...gs]);
    supabase.from('goals').insert({
      user_id:   userIdRef.current,
      title:     optimistic.title,
      timeframe: optimistic.timeframe,
      status:    optimistic.isComplete ? 'completed' : 'active',
      progress:  optimistic.progress,
      target:    optimistic.target === '—' ? null : optimistic.target,
      cadence:   optimistic.cadence === '—' ? null : optimistic.cadence,
      metric:    optimistic.metric === '—' ? null : optimistic.metric,
      kind:      optimistic.kind,
    }).select().single().then(({ data: row, error }) => {
      if (error) {
        console.error('addGoal error:', error);
        setGoals(gs => gs.filter(g => g.id !== optimisticId));
        return;
      }
      setGoals(gs => gs.map(g => g.id === optimisticId ? rowToGoal(row) : g));
    });
  }, []);

  const goalsRef = useRef<Goal[]>([]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);

  const updateGoalRaw = useCallback((id: string, patch: Partial<Goal>) => {
    goalsRef.current = goalsRef.current.map(g => g.id === id ? { ...g, ...patch } : g);
    setGoals(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g));
    const dbPatch: Record<string, unknown> = {};
    if (patch.title      !== undefined) dbPatch.title     = patch.title;
    if (patch.timeframe  !== undefined) dbPatch.timeframe = patch.timeframe;
    if (patch.isComplete !== undefined) dbPatch.status    = patch.isComplete ? 'completed' : 'active';
    if (patch.progress   !== undefined) dbPatch.progress  = patch.progress;
    if (patch.target     !== undefined) dbPatch.target    = patch.target === '—' ? null : patch.target;
    if (patch.cadence    !== undefined) dbPatch.cadence   = patch.cadence === '—' ? null : patch.cadence;
    if (patch.metric     !== undefined) dbPatch.metric    = patch.metric === '—' ? null : patch.metric;
    if (patch.kind       !== undefined) dbPatch.kind      = patch.kind;
    if (!Object.keys(dbPatch).length) return;
    supabase.from('goals').update(dbPatch).eq('id', id).then(({ error }) => {
      if (error) console.error('updateGoal error:', error);
    });
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals(gs => gs.filter(g => g.id !== id));
    supabase.from('goals').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('removeGoal error:', error);
    });
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>, label?: string) => {
    const before = goalsRef.current.find(g => g.id === id);
    if (!before) return;
    const keys = (Object.keys(patch) as (keyof Goal)[]).filter(k => patch[k] !== before[k]);
    if (!keys.length) return;
    const prev = Object.fromEntries(keys.map(k => [k, before[k]])) as Partial<Goal>;
    const next = Object.fromEntries(keys.map(k => [k, patch[k]])) as Partial<Goal>;
    updateGoalRaw(id, next);
    record({
      label: label ?? `Edited “${before.title}”`,
      undo: () => updateGoalRaw(id, prev),
      redo: () => updateGoalRaw(id, next),
    });
  }, [updateGoalRaw, record]);

  const toggleGoal = useCallback((id: string) => {
    const g = goalsRef.current.find(x => x.id === id);
    if (!g) return;
    updateGoal(id, { isComplete: !g.isComplete },
      g.isComplete ? `Reopened “${g.title}”` : `Completed “${g.title}”`);
  }, [updateGoal]);

  const api: DashboardApi = {
    tasks, setTasks, habits, setHabits, journal, setJournal,
    projects, setProjects, goals, modal, setModal,
    toggleTask, starTask, toggleTaskProgress, toggleHabit, reorderTasks,
    addTask, updateTask, removeTask, addJournal,
    addHabit, updateHabit, removeHabit,
    addProject, updateProject, removeProject, assignTask,
    addGoal, updateGoal, removeGoal, toggleGoal,
    undo, redo,
    undoLabel: historyLabels.undo,
    redoLabel: historyLabels.redo,
    lastHistoryEvent,
  };

  return <DashCtx.Provider value={api}>{children}</DashCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard() {
  const ctx = useContext(DashCtx);
  if (!ctx) throw new Error('useDashboard must be used within DashProvider');
  return ctx;
}
