import { useSyncExternalStore } from 'react';

// Which Google calendars the user has unticked, mirroring the checkboxes in
// Google Calendar's own sidebar. Stored by calendar name (the edge function
// sends names, not ids) and kept device-local like the other UI prefs.
const KEY = 'pos:calendar-hidden';

function load(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

// Module-level so the grid, the agenda and the next-up widget all read one
// source of truth and repaint together when a calendar is toggled.
let hidden = load();
const subscribers = new Set<() => void>();

function commit(next: Set<string>) {
  hidden = next;
  try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  for (const notify of subscribers) notify();
}

export function toggleCalendar(name: string) {
  const next = new Set(hidden);
  if (!next.delete(name)) next.add(name);
  commit(next);
}

/** Bulk show/hide, backing the panel's "Show all" / "Hide all" actions. */
export function setCalendarsHidden(names: string[], isHidden: boolean) {
  const next = new Set(hidden);
  for (const n of names) {
    if (isHidden) next.add(n); else next.delete(n);
  }
  commit(next);
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => { subscribers.delete(notify); };
}

// Another tab toggling a calendar should move this one too.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  hidden = load();
  for (const notify of subscribers) notify();
});

export function useHiddenCalendars(): Set<string> {
  return useSyncExternalStore(subscribe, () => hidden, () => hidden);
}
