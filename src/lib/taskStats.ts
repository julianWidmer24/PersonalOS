import { useEffect, useState } from 'react';
import type { Task, TaskCompletion } from '../types';

// Completion history: turning "a task was checked off" into the numbers the
// dashboard shows — today's count, and a distribution over a chosen window.
//
// Everything here works in *local* dates. A completion logged at 11pm belongs
// to that evening, not to tomorrow in UTC, so days are keyed by the local
// calendar and never by toISOString().

// ── Local date keys ───────────────────────────────────────────
/** Local-date key, YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const todayKey = () => dateKey(new Date());

/** The inverse of `dateKey` — local midnight on that day. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Midnight at the start of `d`'s local day. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** `n` days after the start of `d`'s local day (negative goes back). */
export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday 00:00 of `d`'s local week. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  // getDay(): 0 = Sunday. Shift so Monday is the first day of the week.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// ── Counting completions ──────────────────────────────────────
/**
 * How many tasks were finished on each local day, as `date key → count`.
 *
 * Two sources are merged. `task_completions` is the durable one and the only
 * one that reaches past a day. Tasks still sitting in the done bucket are the
 * fallback, so today's number is right even on a database that hasn't run
 * migration 014 yet — and so a completion logged by this tab counts the moment
 * it happens, before the insert comes back. A task appearing in both is one
 * completion, not two.
 */
export function countsByDay(completions: TaskCompletion[], tasks: Task[]): Map<string, number> {
  const seen = new Set<string>();
  const counts = new Map<string, number>();

  const add = (date: string, id: string) => {
    if (seen.has(`${date}|${id}`)) return;
    seen.add(`${date}|${id}`);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  };

  for (const c of completions) add(c.date, c.taskId ?? `completion:${c.id}`);
  for (const t of tasks) {
    if (t.status !== 'done' || !t.completedAt) continue;
    const at = new Date(t.completedAt);
    if (Number.isNaN(at.getTime())) continue;
    add(dateKey(at), t.id);
  }
  return counts;
}

// ── Distribution buckets ──────────────────────────────────────
export const SCALES = ['Week', 'Month', 'Year'] as const;
export type DistributionScale = (typeof SCALES)[number];

export interface DistributionBucket {
  /** Local-date key of the first day in the bucket — also its React key. */
  key: string;
  count: number;
  /** Axis tick, or '' where the tick is deliberately skipped to avoid a pile-up. */
  tick: string;
  /** Full description for the hover readout, e.g. "Mon, Sep 29". */
  label: string;
  /** True for the bucket today falls in. */
  isCurrent: boolean;
}

export interface Distribution {
  buckets: DistributionBucket[];
  /** What one bar covers — 'day' for Week/Month, 'week' for Year. */
  grain: 'day' | 'week';
  total: number;
  /** Tasks per bucket across the window, one decimal. */
  average: number;
  /** The busiest bucket, or null when nothing was finished in the window. */
  best: DistributionBucket | null;
  /** Human name of the window, for the card's kicker. */
  rangeLabel: string;
}

/** How many buckets, and how wide, each scale shows. */
const SHAPE: Record<DistributionScale, { count: number; grain: 'day' | 'week'; range: string }> = {
  // A trailing window rather than a calendar one, so the last bar is always
  // today and the chart never opens on a mostly-empty Monday.
  Week:  { count: 7,  grain: 'day',  range: 'last 7 days' },
  Month: { count: 30, grain: 'day',  range: 'last 30 days' },
  Year:  { count: 52, grain: 'week', range: 'last 52 weeks' },
};

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A window can reach back over New Year, and "Week of Oct 6" with no year is a
// puzzle in the 52-week view — so the year appears exactly when it isn't this one.
const withYear = (d: Date, now: Date) =>
  (d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' as const });

const fmtDay = (d: Date, now: Date) =>
  d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', ...withYear(d, now) });
const fmtShort = (d: Date, now: Date) =>
  d.toLocaleDateString([], { month: 'short', day: 'numeric', ...withYear(d, now) });

/**
 * Bucket `counts` into the bars one scale shows, oldest first, ending on the
 * bucket that contains `now`. Empty buckets are present with a count of 0 —
 * a day you did nothing is data, and dropping it would squash the time axis.
 */
export function buildDistribution(
  counts: Map<string, number>,
  scale: DistributionScale,
  now: Date = new Date(),
): Distribution {
  const { count: n, grain, range } = SHAPE[scale];
  const buckets: DistributionBucket[] = [];

  if (grain === 'day') {
    const today = startOfDay(now);
    for (let i = n - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const key = dateKey(d);
      buckets.push({
        key,
        count: counts.get(key) ?? 0,
        // Week labels every day; a month of them would collide, so it ticks
        // the 1st and every 5th day back from today instead.
        tick: scale === 'Week'
          ? DAY_INITIALS[d.getDay()]
          : i % 5 === 0 ? String(d.getDate()) : '',
        label: i === 0 ? `Today · ${fmtShort(d, now)}` : fmtDay(d, now),
        isCurrent: i === 0,
      });
    }
  } else {
    const thisWeek = startOfWeek(now);
    let lastMonth = -1;
    for (let i = n - 1; i >= 0; i--) {
      const start = addDays(thisWeek, -i * 7);
      const key = dateKey(start);
      let total = 0;
      for (let d = 0; d < 7; d++) total += counts.get(dateKey(addDays(start, d))) ?? 0;
      // One tick per month, on the first week that lands in it — so the axis
      // reads Oct · Nov · Dec rather than 52 unreadable dates.
      const month = start.getMonth();
      const newMonth = month !== lastMonth;
      lastMonth = month;
      buckets.push({
        key,
        count: total,
        tick: newMonth ? start.toLocaleDateString([], { month: 'short' }) : '',
        label: i === 0 ? `This week · from ${fmtShort(start, now)}` : `Week of ${fmtShort(start, now)}`,
        isCurrent: i === 0,
      });
    }
  }

  const total = buckets.reduce((s, b) => s + b.count, 0);
  const best = buckets.reduce<DistributionBucket | null>(
    (m, b) => (b.count > 0 && (!m || b.count > m.count) ? b : m), null,
  );
  return {
    buckets,
    grain,
    total,
    average: Math.round((total / buckets.length) * 10) / 10,
    best,
    rangeLabel: range,
  };
}

// ── Midnight rollover ─────────────────────────────────────────
/**
 * Today's date key, which changes when the local day does. Anything counting
 * "today" re-renders on its own at midnight instead of showing yesterday's
 * number until the page is touched — and a laptop waking from sleep past
 * midnight catches up on its next tick rather than at the next reload.
 */
export function useTodayKey(): string {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = addDays(now, 1).getTime();
      // Cap the wait so a suspended tab re-checks within the hour rather than
      // trusting a timer that slept through the rollover.
      const wait = Math.min(nextMidnight - now.getTime() + 500, 60 * 60 * 1000);
      timer = setTimeout(() => { setKey(todayKey()); schedule(); }, Math.max(wait, 1000));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return key;
}
