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
