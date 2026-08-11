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
  | { kind: 'task' }
  | { kind: 'journal'; prompt: string }
  | { kind: 'project' };
