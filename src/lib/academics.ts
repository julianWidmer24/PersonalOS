import type { GradPlan, PlanSemester, PlannedCourse, Requirement } from '../types';
import { REQUIREMENTS } from '../data/academicsSeed';

/** Catalog number out of a code — "DATA C102" → 102, "COMPSCI 61B" → 61. */
export function catalogNum(code: string): number | null {
  const m = code.match(/(\d{1,3})/);
  return m ? Number(m[1]) : null;
}

export function isUpperDiv(code: string): boolean {
  const n = catalogNum(code);
  return n !== null && n >= 100 && n <= 199;
}

/** Dropped courses and the backlog shelf never count toward anything. */
function counts(sem: PlanSemester, course: PlannedCourse): boolean {
  return sem.kind !== 'backlog' && course.status !== 'dropped' && !course.banked;
}

export function semesterUnits(sem: PlanSemester): number {
  return sem.courses
    .filter(c => c.status !== 'dropped')
    .reduce((s, c) => s + (Number(c.units) || 0), 0);
}

/** Units the term adds on top of the APR baseline (excludes banked courses). */
export function semesterNewUnits(sem: PlanSemester): number {
  return sem.courses.filter(c => counts(sem, c)).reduce((s, c) => s + (Number(c.units) || 0), 0);
}

export function capFor(plan: GradPlan, sem: PlanSemester): number | null {
  if (sem.kind === 'backlog') return null;
  return sem.unitCap ?? plan.unitCap;
}

export function isOverCap(plan: GradPlan, sem: PlanSemester): boolean {
  const cap = capFor(plan, sem);
  return cap !== null && semesterUnits(sem) > cap + 1e-9;
}

export interface ReqProgress {
  req: Requirement;
  haveCourses: number;
  haveUnits: number;
  /** 0–1, the lower of the course and unit ratios. */
  pct: number;
  met: boolean;
  /** Codes of the plan courses currently filling this requirement. */
  filledBy: string[];
}

export function evaluateRequirements(plan: GradPlan, reqs: Requirement[] = REQUIREMENTS): ReqProgress[] {
  const rows: { sem: PlanSemester; course: PlannedCourse }[] = [];
  for (const sem of plan.semesters) {
    for (const course of sem.courses) if (counts(sem, course)) rows.push({ sem, course });
  }

  return reqs.map(req => {
    let haveCourses = req.doneCourses;
    let haveUnits = req.doneUnits;
    const filledBy: string[] = [];

    switch (req.mode) {
      case 'tag':
        for (const { course } of rows) {
          if (course.reqs.includes(req.id)) {
            haveCourses += 1;
            haveUnits += course.units;
            filledBy.push(course.code);
          }
        }
        break;
      case 'allUnits':
        for (const { course } of rows) haveUnits += course.units;
        break;
      case 'udUnits':
        for (const { course } of rows) if (isUpperDiv(course.code)) haveUnits += course.units;
        break;
      case 'udMajorUnits':
        for (const { course } of rows) {
          if (isUpperDiv(course.code) && course.reqs.includes('major')) {
            haveUnits += course.units;
            filledBy.push(course.code);
          }
        }
        break;
      case 'residence':
        for (const { sem, course } of rows) if (sem.kind === 'term') haveUnits += course.units;
        break;
      case 'terms':
        for (const sem of plan.semesters) {
          if (sem.kind === 'term' && semesterUnits(sem) >= req.needUnits) {
            haveCourses += 1;
            filledBy.push(`${sem.season} ${sem.year}`);
          }
        }
        haveUnits = req.needUnits; // the unit side is per-term, not cumulative
        break;
    }

    const cRatio = req.needCourses ? haveCourses / req.needCourses : 1;
    const uRatio = req.needUnits ? haveUnits / req.needUnits : 1;
    const pct = Math.max(0, Math.min(1, Math.min(cRatio, uRatio)));
    return { req, haveCourses, haveUnits, pct, met: pct >= 1, filledBy };
  });
}

export interface PlanStats {
  /** New units this plan adds on top of the 99.84 already banked. */
  newUnits: number;
  totalUnits: number;
  overCapTerms: number;
  teachingTerms: number;
  unmet: number;
  /** Courses parked on the backlog shelf. */
  backlog: number;
}

export function planStats(plan: GradPlan, progress?: ReqProgress[]): PlanStats {
  const prog = progress ?? evaluateRequirements(plan);
  const total = prog.find(p => p.req.id === 'units120');
  const newUnits = plan.semesters.reduce((s, sem) => s + semesterNewUnits(sem), 0);
  return {
    newUnits,
    totalUnits: total ? total.haveUnits : newUnits,
    overCapTerms: plan.semesters.filter(s => isOverCap(plan, s)).length,
    teachingTerms: plan.semesters.filter(s => s.kind === 'term').length,
    unmet: prog.filter(p => !p.met).length,
    backlog: plan.semesters.find(s => s.kind === 'backlog')?.courses.length ?? 0,
  };
}

/** Short chip labels for the requirement tags a course can carry. */
export const REQ_CHIP: Record<string, { label: string; fg: string }> = {
  depth:          { label: 'Depth',        fg: 'var(--blue)'   },
  prob:           { label: 'Probability',  fg: 'var(--blue)'   },
  mldm:           { label: 'Modeling/ML',  fg: 'var(--blue)'   },
  'domain-ld':    { label: 'Domain LD',    fg: 'var(--purple)' },
  'domain-ud':    { label: 'Domain UD',    fg: 'var(--purple)' },
  major:          { label: 'UD major',     fg: 'var(--green)'  },
  'breadth-intl': { label: 'Intl Studies', fg: 'var(--amber)'  },
  'breadth-hist': { label: 'Historical',   fg: 'var(--amber)'  },
  'breadth-soc':  { label: 'Social Sci',   fg: 'var(--amber)'  },
};

/** The tags a course can be given, in the order they show in the editor. */
export const TAGGABLE_REQS = Object.keys(REQ_CHIP);

export const STATUS_STYLE: Record<PlannedCourse['status'], { label: string; fg: string; bg: string }> = {
  planned:   { label: 'Planned',   fg: 'var(--t2)',   bg: 'var(--bg-elev)'          },
  enrolled:  { label: 'Enrolled',  fg: 'var(--blue)', bg: 'rgba(147,197,253,.12)'   },
  completed: { label: 'Completed', fg: 'var(--green)',bg: 'rgba(110,231,183,.12)'   },
  dropped:   { label: 'Dropped',   fg: 'var(--t3)',   bg: 'var(--bg-elev)'          },
};

export function semesterLabel(sem: PlanSemester): string {
  return sem.kind === 'backlog' ? 'Backlog' : `${sem.season} ${sem.year}`;
}

export const newCourseId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
