export type TaskStatus = 'now' | 'next' | 'later' | 'done';
export type TaskPriority = 'P0' | 'P1' | 'P2';
export type TaskTag = 'course' | 'career' | 'personal' | 'health';

export interface Task {
  id: string;
  title: string;
  tag: TaskTag;
  priority: TaskPriority;
  status: TaskStatus;
  due: string;
  est: string;
  projectId: string | null;
  isStarred?: boolean;
}

export type ProjectStatus = 'active' | 'paused' | 'done';

export interface Project {
  id: string;
  title: string;
  description: string;
  color: string;
  due: string;
  status: ProjectStatus;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  hist: string;
  streak: number;
  done: boolean;
}

export type EventKind = 'class' | 'career' | 'personal' | 'work' | 'workout' | 'workout-run';

export interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  start: number;
  end: number;
  kind: EventKind;
  loc: string;
  /** Google Calendar this came from (absent for locally-derived events). */
  calendar?: string;
  /** That calendar's Google colour, as a hex string. */
  calendarColor?: string;
  _derived?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  target: string;
  cadence: string;
  metric: string;
  kind: string;
  timeframe: 'week' | 'month' | 'semester' | 'year';
  isComplete: boolean;
}

export interface LifeArea {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  taskTag?: TaskTag;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  excerpt: string;
}

export interface Ingredient {
  name: string;
  qty: string;
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export interface Meal {
  id: string;
  slot: MealSlot;
  name: string;
  kcal: number;
  protein: number;
  ingredients: Ingredient[];
  steps: string[];
}

export interface MealPlanData {
  prompt: string;
  generatedAt: string;
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: Meal[];
}

export interface WorkoutEntry {
  confirmed: boolean;
  photo: string | null;
  idx: number;
  /** Per-day overrides of the routine's suggestion. Absent → use the routine. */
  name?: string;
  exercises?: string[];
}

export interface WorkoutLog {
  entries: Record<string, WorkoutEntry>;
  streak: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: string[];
}

export interface WorkoutRoutineData {
  workouts: WorkoutRoutine[];
  raw: string;
  importedAt: string;
}

export interface PhysiqueEntry {
  id?: string;
  week: number;
  label: string;
  date: string;
  dataUrl: string | null;
}

export interface HealthData {
  sleep: { hours: number; target: number; trend: number[] };
  steps: { count: number; target: number };
  calories: { eaten: number; target: number; p: number; c: number; f: number };
  weight: { kg: number; trend: number[] };
  workouts: { thisWeek: number; target: number };
}

export interface FinanceCategory {
  name: string;
  spent: number;
  of: number;
  color: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  cat: string;
  amt: number;
  when: string;
}

export interface CashFlowPoint {
  d: string;
  v: number;
}

export interface FinanceData {
  netWorth: number;
  monthSpend: number;
  monthBudget: number;
  savingsRate: number;
  cashFlow: CashFlowPoint[];
  categories: FinanceCategory[];
  transactions: Transaction[];
}

export type ModalState =
  | null
  | { kind: 'task'; taskId?: string }
  | { kind: 'journal'; prompt: string }
  | { kind: 'project' };

// ── Academics: course planner ───────────────────────────────
export type CourseStatus = 'planned' | 'enrolled' | 'completed' | 'dropped';

/** A requirement bucket id — see ACADEMIC_REQS in data/academicsSeed.ts. */
export type ReqId = string;

export interface PlannedCourse {
  id: string;
  /** Berkeley catalog code, e.g. "DATA C102". Upper division is read off it. */
  code: string;
  title: string;
  units: number;
  status: CourseStatus;
  grade?: string;
  /** Requirement buckets this course is meant to fill. */
  reqs: ReqId[];
  note?: string;
  /**
   * True when the 08/19/2026 APR baseline already counts this course (work in
   * progress at report time). It still shows in the plan, but is left out of
   * the remaining-units math so it isn't counted twice.
   */
  banked?: boolean;
}

export type TermSeason = 'Fall' | 'Spring' | 'Summer';

/**
 * 'term'       — a normal Berkeley semester, counts toward units in residence
 * 'internship' — a work term; courses are optional and usually zero
 * 'backlog'    — a shelf of candidate courses that aren't scheduled yet, so
 *                they deliberately don't count toward any requirement
 */
export type SemesterKind = 'term' | 'internship' | 'backlog';

export interface PlanSemester {
  id: string;
  season: TermSeason;
  year: number;
  kind: SemesterKind;
  /** Overrides the plan's cap for this term (e.g. a lighter co-op semester). */
  unitCap?: number | null;
  note?: string;
  courses: PlannedCourse[];
}

export interface GradPlan {
  id: string;
  name: string;
  gradTerm: string;
  blurb: string;
  /** Hard cap on units per semester; semesters over it are flagged. */
  unitCap: number;
  semesters: PlanSemester[];
}

/**
 * How a requirement counts what's been done:
 *  tag           — courses tagged with this req id
 *  allUnits      — every scheduled unit
 *  udUnits       — units from upper division courses (catalog 100–199)
 *  udMajorUnits  — upper division units also tagged 'major'
 *  residence     — units taken in a Berkeley semester
 *  terms         — semesters carrying at least `needUnits` units
 */
export type ReqMode = 'tag' | 'allUnits' | 'udUnits' | 'udMajorUnits' | 'residence' | 'terms';

export interface Requirement {
  id: ReqId;
  group: string;
  label: string;
  mode: ReqMode;
  /** Already banked by the APR at report time. */
  doneCourses: number;
  doneUnits: number;
  needCourses: number;
  needUnits: number;
  options?: string;
  note?: string;
}

export interface TranscriptCourse {
  code: string;
  title: string;
  units: number;
  grade: string;
  /** EN enrolled · TR transfer · TE exam credit · IP in progress */
  type?: string;
}

export interface TranscriptTerm {
  id: string;
  label: string;
  courses: TranscriptCourse[];
}

export interface AcademicsData {
  plans: GradPlan[];
  activePlanId: string;
}
