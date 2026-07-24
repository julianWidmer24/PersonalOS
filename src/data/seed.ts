import type {
  Task,
  Project,
  Habit,
  CalendarEvent,
  Goal,
  JournalEntry,
  MealPlanData,
} from '../types';

export const SEED_DATA = {
  user: { name: 'Julian', major: '', year: '', school: '' },
  quote: '',

  projects:       [] as Project[],
  tasks:          [] as Task[],
  habits:         [] as Habit[],
  events:         [] as CalendarEvent[],
  goals:          [] as Goal[],
  journalPrompts: [
    'What is one thing I learned today that surprised me?',
    'Where did I lose focus, and what triggered it?',
    'If today were a footnote in my year, what would it say?',
    'What did I avoid, and what was I really afraid of?',
  ],
  journalEntries: [] as JournalEntry[],
};

export const SEED_MEAL_PLAN: MealPlanData = {
  prompt: '',
  generatedAt: '',
  totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  meals: [],
};
