import { useState, useEffect, useMemo } from 'react';
import type { WorkoutRoutineData, WorkoutLog, CalendarEvent } from '../types';

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
  } catch {}
  return { workouts: [], raw: '', importedAt: '' };
}

function loadLog(): WorkoutLog {
  try {
    const v = JSON.parse(localStorage.getItem(WORKOUT_LOG_KEY) || 'null');
    if (v && v.entries) return v;
  } catch {}
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

export function usePhysical() {
  const [routine, setRoutineState] = useState<WorkoutRoutineData>(loadRoutine);
  const [log, setLogState]         = useState<WorkoutLog>(loadLog);

  const setRoutine = (r: WorkoutRoutineData) => setRoutineState(r);
  const setLog     = (updater: WorkoutLog | ((prev: WorkoutLog) => WorkoutLog)) => {
    setLogState(updater);
  };

  useEffect(() => {
    try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine)); } catch {}
    window.dispatchEvent(new Event('pos:routine-changed'));
  }, [routine]);

  useEffect(() => {
    try { localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(log)); } catch {}
    window.dispatchEvent(new Event('pos:log-changed'));
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

  const routine = useMemo(loadRoutine, [tick]);
  const log     = useMemo(loadLog, [tick]);
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
  }, [baseEvents, tick]);
}

export { loadRoutine, loadLog, SEED_ROUTINE_TEXT };
