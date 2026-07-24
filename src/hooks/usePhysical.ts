import { useState, useEffect, useMemo, useRef } from 'react';
import type { WorkoutRoutineData, WorkoutLog, CalendarEvent } from '../types';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUser';

const ROUTINE_KEY    = 'pos:routine:v2';
const WORKOUT_LOG_KEY = 'pos:workout-log:v2';

const SEED_ROUTINE_TEXT =
`Push: bench press, overhead press, incline DB press, lateral raises, tricep pushdowns
Run: 5k easy Z2
Pull: deadlift, barbell row, weighted pullups, face pulls, hammer curls
Legs: back squat, Romanian deadlift, walking lunges, calf raises
Run: 8 x 400m intervals
Upper: weighted dips, chinups, landmine press, rear delt flyes
Long run: 10k zone 2`;

export function parseRoutine(text: string) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const idx = l.indexOf(':');
      const name = idx > 0 ? l.slice(0, idx).trim() : l.trim();
      const exercises = idx > 0
        ? l.slice(idx + 1).split(',').map(s => s.trim()).filter(Boolean)
        : [];
      return { id: 'w' + i, name, exercises };
    });
}

export const KIND_FROM_NAME = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('run') || n.includes('cardio'))  return { fg: '#6ee7b7', bg: 'rgba(110,231,183,.12)', icon: '🏃', label: 'run'  };
  if (n.includes('rest'))                         return { fg: '#9ca3af', bg: 'rgba(156,163,175,.12)', icon: '◯', label: 'rest' };
  if (n.includes('push') || n.includes('upper'))  return { fg: '#93c5fd', bg: 'rgba(147,197,253,.12)', icon: '▲', label: 'push' };
  if (n.includes('pull'))                         return { fg: '#c4b5fd', bg: 'rgba(196,181,253,.12)', icon: '▼', label: 'pull' };
  if (n.includes('leg') || n.includes('lower'))   return { fg: '#f5c451', bg: 'rgba(245,196,81,.12)',  icon: '■', label: 'legs' };
  return { fg: '#e5e5e5', bg: 'rgba(229,229,229,.10)', icon: '◆', label: 'lift' };
};

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function dayIndex(d = new Date()) {
  return Math.floor((d.getTime() - new Date(2026, 0, 1).getTime()) / 86400000);
}

function loadRoutine(): WorkoutRoutineData {
  try {
    const v = JSON.parse(localStorage.getItem(ROUTINE_KEY) || 'null');
    if (v && v.workouts?.length) return v;
  } catch { /* ignore */ }
  return { workouts: [], raw: '', importedAt: '' };
}

function loadLog(): WorkoutLog {
  try {
    const v = JSON.parse(localStorage.getItem(WORKOUT_LOG_KEY) || 'null');
    if (v && v.entries) return v;
  } catch { /* ignore */ }
  const today = new Date();
  const entries: WorkoutLog['entries'] = {};
  const mkDate = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return todayKey(d);
  };
  [-6, -5, -3, -2, -1].forEach(o => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + o);
    entries[mkDate(o)] = { confirmed: true, photo: null, idx: dayIndex(dt) };
  });
  return { entries, streak: 2 };
}

// Consecutive confirmed days back from today.
function computeStreak(entries: WorkoutLog['entries']): number {
  let s = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    if (entries[todayKey(d)]?.confirmed) { s++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return s;
}

// Offline-first, same pattern as usePhysique: localStorage stays the synchronous
// cache (so the sync readers below keep working), Supabase (migration 006 tables
// `workout_routines` + `workout_log_days`) is the cross-device backing store.
// If those tables aren't present the remote calls no-op and the app runs locally.
export function usePhysical() {
  const [routine, setRoutineState] = useState<WorkoutRoutineData>(loadRoutine);
  const [log, setLogState]         = useState<WorkoutLog>(loadLog);

  const routineIdRef  = useRef<string | null>(null);
  const routineReady  = useRef(false);
  const logReady      = useRef(false);
  const syncedRoutine = useRef<WorkoutRoutineData>(routine);
  const syncedLog     = useRef<WorkoutLog>(log);

  const setRoutine = (r: WorkoutRoutineData) => setRoutineState(r);
  const setLog     = (updater: WorkoutLog | ((prev: WorkoutLog) => WorkoutLog)) => {
    setLogState(updater);
  };

  // Write-through to localStorage + notify the sync readers (unchanged).
  useEffect(() => {
    try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine)); } catch { /* ignore */ }
    window.dispatchEvent(new Event('pos:routine-changed'));
  }, [routine]);

  useEffect(() => {
    try { localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(log)); } catch { /* ignore */ }
    window.dispatchEvent(new Event('pos:log-changed'));
  }, [log]);

  // Hydrate routine + log from Supabase once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rRes, lRes] = await Promise.all([
        supabase.from('workout_routines').select('*').eq('is_active', true)
          .order('imported_at', { ascending: false }).limit(1),
        supabase.from('workout_log_days').select('*'),
      ]);
      if (cancelled) return;

      if (!rRes.error && rRes.data) {
        routineReady.current = true;
        if (rRes.data.length) {
          const row = rRes.data[0];
          routineIdRef.current = row.id;
          const rd: WorkoutRoutineData = {
            workouts: row.workouts ?? [], raw: row.raw ?? '', importedAt: row.imported_at ?? '',
          };
          syncedRoutine.current = rd;
          setRoutineState(rd);
        }
      }

      if (!lRes.error && lRes.data) {
        logReady.current = true;
        if (lRes.data.length) {
          const entries: WorkoutLog['entries'] = {};
          for (const d of lRes.data) {
            entries[String(d.log_date)] = { confirmed: !!d.confirmed, photo: d.photo ?? null, idx: d.idx ?? 0 };
          }
          const wl: WorkoutLog = { entries, streak: computeStreak(entries) };
          syncedLog.current = wl;
          setLogState(wl);
        } else {
          syncedLog.current = { entries: {}, streak: 0 };
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Push routine changes: single active row per user (update or insert).
  useEffect(() => {
    if (!routineReady.current || routine === syncedRoutine.current) return;
    syncedRoutine.current = routine;
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      if (routineIdRef.current) {
        await supabase.from('workout_routines')
          .update({ raw: routine.raw, workouts: routine.workouts, imported_at: new Date().toISOString() })
          .eq('id', routineIdRef.current);
      } else {
        await supabase.from('workout_routines').update({ is_active: false }).eq('user_id', uid).eq('is_active', true);
        const { data, error } = await supabase.from('workout_routines')
          .insert({ user_id: uid, raw: routine.raw, workouts: routine.workouts, is_active: true })
          .select().single();
        if (!error && data) routineIdRef.current = data.id;
      }
    })();
  }, [routine]);

  // Push log changes: upsert added/changed days, delete removed ones.
  useEffect(() => {
    if (!logReady.current || log === syncedLog.current) return;
    const prev = syncedLog.current;
    syncedLog.current = log;
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const prevE = prev.entries, nextE = log.entries;
      for (const k of Object.keys(nextE)) {
        const n = nextE[k], p = prevE[k];
        if (!p || p.confirmed !== n.confirmed || p.photo !== n.photo || p.idx !== n.idx) {
          await supabase.from('workout_log_days').upsert(
            { user_id: uid, log_date: k, confirmed: n.confirmed, photo: n.photo, idx: n.idx },
            { onConflict: 'user_id,log_date' },
          );
        }
      }
      for (const k of Object.keys(prevE)) {
        if (!nextE[k]) await supabase.from('workout_log_days').delete().eq('user_id', uid).eq('log_date', k);
      }
    })();
  }, [log]);

  return { routine, setRoutine, log, setLog };
}

export function useWorkoutToday() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('storage', handler);
    window.addEventListener('pos:routine-changed', handler);
    window.addEventListener('pos:log-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('pos:routine-changed', handler);
      window.removeEventListener('pos:log-changed', handler);
    };
  }, []);

  // `tick` intentionally invalidates these on storage / pos:*-changed events.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routine = useMemo(() => loadRoutine(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const log     = useMemo(() => loadLog(), [tick]);
  const di = dayIndex();
  const idx = ((di % routine.workouts.length) + routine.workouts.length) % routine.workouts.length;
  const workout = routine.workouts[idx];
  const doneToday = !!log.entries[todayKey()]?.confirmed;
  const streak = log.streak || 0;
  return { workout, idx, doneToday, streak, total: routine.workouts.length, kind: KIND_FROM_NAME(workout?.name || '') };
}

export function workoutsToEvents(routine: WorkoutRoutineData, weekStartDi: number): CalendarEvent[] {
  if (!routine?.workouts?.length) return [];
  const out: CalendarEvent[] = [];
  for (let day = 0; day < 7; day++) {
    const di = weekStartDi + day;
    const idx = ((di % routine.workouts.length) + routine.workouts.length) % routine.workouts.length;
    const w = routine.workouts[idx];
    if (!w) continue;
    const isRun  = /run|cardio/i.test(w.name);
    const isRest = /rest/i.test(w.name);
    if (isRest) continue;
    const isWeekend = day >= 5;
    const start = isRun || isWeekend ? 8.0 : 17.5;
    const end   = isRun || isWeekend ? 9.0 : 18.5;
    out.push({
      id: `wk-${day}-${idx}`,
      day, start, end,
      title: w.name,
      kind: isRun ? 'workout-run' : 'workout',
      loc: isRun ? 'Fire Trail' : 'RSF',
      _derived: true,
    });
  }
  return out;
}

export function useMergedCalendarEvents(baseEvents: CalendarEvent[]): CalendarEvent[] {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener('storage', h);
    window.addEventListener('pos:routine-changed', h);
    return () => {
      window.removeEventListener('storage', h);
      window.removeEventListener('pos:routine-changed', h);
    };
  }, []);

  return useMemo(() => {
    const routine = loadRoutine();
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const wStart = dayIndex(monday);
    const wk = workoutsToEvents(routine, wStart);
    const filteredBase = baseEvents.filter(e => !/^(gym|5k long run)$/i.test(e.title));
    return [...filteredBase, ...wk];
    // `tick` is intentional: it forces a recompute when the routine changes
    // (bumped by the storage / pos:routine-changed listeners above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseEvents, tick]);
}

export { loadRoutine, loadLog, SEED_ROUTINE_TEXT };
