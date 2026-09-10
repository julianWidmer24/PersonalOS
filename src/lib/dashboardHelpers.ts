import { useState, useEffect } from 'react';

// Pure formatting/color helpers and the clock hook, extracted from
// DashboardContext so that file only exports components (keeps Vite fast
// refresh reliable — see react-refresh/only-export-components).

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

// ── Due dates ─────────────────────────────────────────────────
// Task.due is a plain YYYY-MM-DD once it's set, '—' when there's none. Rows
// created before dates were editable can still carry free text ('Today').
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isDueDate = (due?: string) => !!due && ISO_DATE.test(due);

/** Days from today until `due` — negative when overdue, null if undated. */
export function daysUntilDue(due?: string): number | null {
  if (!isDueDate(due)) return null;
  const [y, m, d] = due!.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** True for anything due today or already overdue (plus legacy 'today' text). */
export function isDueToday(due?: string): boolean {
  const days = daysUntilDue(due);
  return days === null ? /today/i.test(due ?? '') : days <= 0;
}

/** Formats a due date for a compact row: 'today', 'Mon 3', '2d late'. */
export function fmtDue(due?: string): string {
  const days = daysUntilDue(due);
  if (days === null) return due ?? '—';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 0) return `${-days}d late`;
  const [y, m, d] = due!.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Durations ─────────────────────────────────────────────────
/**
 * A span of milliseconds as the two largest units that still matter —
 * "45s", "12m 30s", "3h 12m", "2d 4h". The smallest unit leads and is dropped
 * as soon as a bigger one takes over, so a stopwatch reads in seconds, grows
 * into minutes, then hours, and never repaints a digit nobody is watching.
 */
export function fmtSpan(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

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
