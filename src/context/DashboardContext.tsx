import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Project, Habit, JournalEntry, Goal, ModalState } from '../types';
import { supabase } from '../lib/supabase';

// ── Format helpers ────────────────────────────────────────────
export const fmt = {
  money: (n: number) =>
    (n < 0 ? '−$' : '$') +
    Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  moneyShort: (n: number) =>
    (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 }),
  pct: (x: number) => Math.round(x * 100) + '%',
  timeHM: (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
  greeting: (d: Date) => {
    const h = d.getHours();
    if (h < 5)  return 'Late night,';
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    if (h < 21) return 'Good evening,';
    return 'Late night,';
  },
  dayLabel: (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
};

// ── Color maps ────────────────────────────────────────────────
export const TAG_COLORS: Record<string, { fg: string; bg: string }> = {
  course:   { fg: '#a8c5ff', bg: 'rgba(147,197,253,.10)' },
  career:   { fg: '#c4b5fd', bg: 'rgba(196,181,253,.10)' },
  personal: { fg: '#fcd34d', bg: 'rgba(252,211,77,.10)'  },
  health:   { fg: '#6ee7b7', bg: 'rgba(110,231,183,.10)' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: 'var(--red)',
  P1: 'var(--amber)',
  P2: 'var(--t3)',
};

// ── useClock ──────────────────────────────────────────────────
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Date helpers ──────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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
  backlog:    'later',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): Task {
  return {
    id:        row.id,
    title:     row.title,
    tag:       tagFromCategory(row.category),
    priority:  priorityFromScore(row.priority ?? 2),
    status:    STATUS_FROM_DB[row.status] ?? 'now',
    due:       row.due_date ? String(row.due_date) : 'Today',
    est:       '—',
    projectId: row.project_id ?? null,
    isStarred: row.starred ?? false,
  };
}

// ── Habits: derive done/hist/streak from completions ──────────
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

  // streak: consecutive completed days back from today
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (completedDays.has(daysAgoStr(i))) streak++;
    else break;
  }

  return {
    id:     habitRow.id,
    name:   habitRow.name,
    icon:   '◇',
    hist:   histChars.join(''),
    streak,
    done:   completedDays.has(todayStr()),
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

    supabase
      .from('tasks')
      .select('*')
      .eq('archived', false)
      .in('status', ['today', 'this_week', 'this_month', 'backlog'])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('tasks fetch error:', error); return; }
        setTasks((data ?? []).map(rowToTask));
      });

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
          setTasks(ts => ts.map(t =>
            t.id === payload.new.id ? rowToTask(payload.new) : t
          ));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks(ts => ts.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Load habits + habit_completions + realtime ────────────
  useEffect(() => {
    const since = daysAgoStr(30);

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

  // ── Task mutations ────────────────────────────────────────
  const toggleTask = useCallback((id: string) => {
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      const newStatus = t.status === 'done' ? 'now' : 'done';
      supabase.from('tasks').update({ status: STATUS_TO_DB[newStatus] ?? newStatus }).eq('id', id).then(({ error }) => {
        if (error) console.error('toggleTask error:', error);
      });
      return { ...t, status: newStatus };
    }));
  }, []);

  const starTask = useCallback((id: string) => {
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      const next = !t.isStarred;
      supabase.from('tasks').update({ starred: next }).eq('id', id).then(({ error }) => {
        if (error) console.error('starTask error:', error);
      });
      return { ...t, isStarred: next };
    }));
  }, []);

  const reorderTasks = useCallback((next: Task[]) => setTasks(next), []);

  const addTask = useCallback((data: Partial<Task>) => {
    const optimisticId = 't' + Math.random().toString(36).slice(2, 8);
    const optimistic: Task = {
      id: optimisticId,
      status: 'now', priority: 'P1', tag: 'personal', est: '—', due: 'Today', projectId: null,
      title: '', isStarred: false,
      ...data,
    };
    setTasks(ts => [optimistic, ...ts]);
    const payload: Record<string, unknown> = {
      user_id:  userIdRef.current,
      title:    optimistic.title,
      category: tagToCategory(optimistic.tag),
      priority: priorityToScore(optimistic.priority),
      status:   STATUS_TO_DB[optimistic.status] ?? optimistic.status,
      starred:  optimistic.isStarred ?? false,
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
        setTasks(ts => ts.filter(t => t.id !== optimisticId));
        return;
      }
      setTasks(ts => ts.map(t => t.id === optimisticId ? rowToTask(row) : t));
    });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    const dbPatch: Record<string, unknown> = {};
    if (patch.title     !== undefined) dbPatch.title    = patch.title;
    if (patch.tag       !== undefined) dbPatch.category = tagToCategory(patch.tag);
    if (patch.priority  !== undefined) dbPatch.priority = priorityToScore(patch.priority);
    if (patch.status    !== undefined) dbPatch.status   = STATUS_TO_DB[patch.status] ?? patch.status;
    if (patch.isStarred !== undefined) dbPatch.starred  = patch.isStarred;
    if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
    if (Object.keys(dbPatch).length) {
      supabase.from('tasks').update({ ...dbPatch, updated_at: new Date().toISOString() })
        .eq('id', id).then(({ error }) => {
          if (error) console.error('updateTask error:', error);
        });
    }
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    supabase.from('tasks').update({ archived: true })
      .eq('id', id).then(({ error }) => {
        if (error) console.error('removeTask error:', error);
      });
  }, []);

  // ── Habit mutations ───────────────────────────────────────
  const toggleHabit = useCallback((id: string) => {
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
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, projectId } : t));
    supabase.from('tasks').update({ project_id: projectId }).eq('id', taskId).then(({ error }) => {
      if (error) console.error('assignTask error (is the project_id migration applied?):', error);
    });
  }, []);

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

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
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

  const toggleGoal = useCallback((id: string) => {
    setGoals(gs => gs.map(g => {
      if (g.id !== id) return g;
      const next = !g.isComplete;
      supabase.from('goals').update({ status: next ? 'completed' : 'active' })
        .eq('id', id).then(({ error }) => {
          if (error) console.error('toggleGoal error:', error);
        });
      return { ...g, isComplete: next };
    }));
  }, []);

  const api: DashboardApi = {
    tasks, setTasks, habits, setHabits, journal, setJournal,
    projects, setProjects, goals, modal, setModal,
    toggleTask, starTask, toggleHabit, reorderTasks,
    addTask, updateTask, removeTask, addJournal,
    addHabit, updateHabit, removeHabit,
    addProject, updateProject, removeProject, assignTask,
    addGoal, updateGoal, removeGoal, toggleGoal,
  };

  return <DashCtx.Provider value={api}>{children}</DashCtx.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashCtx);
  if (!ctx) throw new Error('useDashboard must be used within DashProvider');
  return ctx;
}
