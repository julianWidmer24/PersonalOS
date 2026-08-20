import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AcademicsData, GradPlan, PlanSemester, PlannedCourse } from '../types';
import { seedAcademics, seedPlans } from '../data/academicsSeed';
import { newCourseId } from '../lib/academics';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUser';

const KEY = 'pos:academics:v1';

function load(): AcademicsData {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v?.plans?.length) return v as AcademicsData;
  } catch { /* ignore */ }
  return seedAcademics();
}

/**
 * Offline-first, same shape as usePhysical: localStorage is the synchronous
 * cache, Supabase (`academic_plans`, migration 010) is the cross-device store.
 * If the table isn't there yet every remote call no-ops and the planner still
 * works locally.
 */
export function useAcademics() {
  const [data, setData] = useState<AcademicsData>(load);

  const rowId = useRef<string | null>(null);
  const ready = useRef(false);
  const synced = useRef<AcademicsData>(data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from('academic_plans').select('*').order('updated_at', { ascending: false }).limit(1);
      if (cancelled || error || !rows) return;
      ready.current = true;
      if (rows.length && rows[0].data?.plans?.length) {
        rowId.current = rows[0].id;
        synced.current = rows[0].data as AcademicsData;
        setData(rows[0].data as AcademicsData);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Push changes, debounced — the editor writes on every keystroke.
  useEffect(() => {
    if (!ready.current || data === synced.current) return;
    synced.current = data;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const uid = await getUserId();
      if (!uid) return;
      if (rowId.current) {
        await supabase.from('academic_plans')
          .update({ data, updated_at: new Date().toISOString() }).eq('id', rowId.current);
      } else {
        const { data: row, error } = await supabase.from('academic_plans')
          .insert({ user_id: uid, data }).select().single();
        if (!error && row) rowId.current = row.id;
      }
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [data]);

  const activePlan = useMemo(
    () => data.plans.find(p => p.id === data.activePlanId) ?? data.plans[0],
    [data],
  );

  const setActivePlanId = useCallback((id: string) => {
    setData(d => ({ ...d, activePlanId: id }));
  }, []);

  const mutatePlan = useCallback((planId: string, fn: (p: GradPlan) => GradPlan) => {
    setData(d => ({ ...d, plans: d.plans.map(p => (p.id === planId ? fn(p) : p)) }));
  }, []);

  const mutateSemester = useCallback(
    (planId: string, semId: string, fn: (s: PlanSemester) => PlanSemester) => {
      mutatePlan(planId, p => ({
        ...p,
        semesters: p.semesters.map(s => (s.id === semId ? fn(s) : s)),
      }));
    },
    [mutatePlan],
  );

  const addCourse = useCallback((planId: string, semId: string) => {
    const course: PlannedCourse = {
      id: newCourseId(), code: '', title: '', units: 4, status: 'planned', reqs: [],
    };
    mutateSemester(planId, semId, s => ({ ...s, courses: [...s.courses, course] }));
    return course.id;
  }, [mutateSemester]);

  const updateCourse = useCallback(
    (planId: string, semId: string, courseId: string, patch: Partial<PlannedCourse>) => {
      mutateSemester(planId, semId, s => ({
        ...s,
        courses: s.courses.map(c => (c.id === courseId ? { ...c, ...patch } : c)),
      }));
    },
    [mutateSemester],
  );

  const removeCourse = useCallback((planId: string, semId: string, courseId: string) => {
    mutateSemester(planId, semId, s => ({ ...s, courses: s.courses.filter(c => c.id !== courseId) }));
  }, [mutateSemester]);

  const moveCourse = useCallback(
    (planId: string, fromSemId: string, courseId: string, toSemId: string) => {
      if (fromSemId === toSemId) return;
      mutatePlan(planId, p => {
        const from = p.semesters.find(s => s.id === fromSemId);
        const course = from?.courses.find(c => c.id === courseId);
        if (!course) return p;
        return {
          ...p,
          semesters: p.semesters.map(s => {
            if (s.id === fromSemId) return { ...s, courses: s.courses.filter(c => c.id !== courseId) };
            if (s.id === toSemId) return { ...s, courses: [...s.courses, course] };
            return s;
          }),
        };
      });
    },
    [mutatePlan],
  );

  const addSemester = useCallback((planId: string) => {
    mutatePlan(planId, p => {
      const terms = p.semesters.filter(s => s.kind !== 'backlog');
      const last = terms[terms.length - 1];
      // Step one term forward from the last one: Spring → Fall → Spring…
      const season: PlanSemester['season'] = last?.season === 'Fall' ? 'Spring' : 'Fall';
      const year = last ? (last.season === 'Fall' ? last.year + 1 : last.year) : new Date().getFullYear();
      const sem: PlanSemester = {
        id: `s${Date.now().toString(36)}`, season, year, kind: 'term', courses: [],
      };
      const backlogIdx = p.semesters.findIndex(s => s.kind === 'backlog');
      const semesters = [...p.semesters];
      semesters.splice(backlogIdx === -1 ? semesters.length : backlogIdx, 0, sem);
      return { ...p, semesters };
    });
  }, [mutatePlan]);

  const removeSemester = useCallback((planId: string, semId: string) => {
    mutatePlan(planId, p => ({ ...p, semesters: p.semesters.filter(s => s.id !== semId) }));
  }, [mutatePlan]);

  const resetPlan = useCallback((planId: string) => {
    const fresh = seedPlans().find(p => p.id === planId);
    if (fresh) mutatePlan(planId, () => fresh);
  }, [mutatePlan]);

  return {
    data, activePlan, setActivePlanId,
    mutatePlan, mutateSemester,
    addCourse, updateCourse, removeCourse, moveCourse,
    addSemester, removeSemester, resetPlan,
  };
}
