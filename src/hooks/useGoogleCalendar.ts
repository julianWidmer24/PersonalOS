import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent, GoogleCalendarMeta } from '../types';

// Monday (local) of the current week as YYYY-MM-DD.
function currentMondayStr(d = new Date()): string {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const da = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export interface GoogleCalendarState {
  connected: boolean;
  email: string | null;
  events: CalendarEvent[];
  /** every calendar in the account, whether or not it's currently shown */
  calendars: GoogleCalendarMeta[];
  loading: boolean;
  refresh: () => void;
}

type Snapshot = Omit<GoogleCalendarState, 'refresh'>;

// One shared fetch for the whole app. Several widgets read the calendar now
// (the grid, the next-up countdown), and each mounting its own copy of this
// hook would fire a duplicate edge-function call on every page load.
const EMPTY: CalendarEvent[] = [];
const NO_CALENDARS: GoogleCalendarMeta[] = [];
let snapshot: Snapshot = { connected: false, email: null, events: EMPTY, calendars: NO_CALENDARS, loading: true };
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  for (const notify of subscribers) notify();
}

function fetchEvents(): Promise<void> {
  if (inflight) return inflight;
  inflight = supabase.functions
    .invoke('google-calendar', { body: { weekStart: currentMondayStr() } })
    .then(({ data, error }) => {
      if (error || !data || data.error) {
        setSnapshot({ connected: false, email: null, events: EMPTY, calendars: NO_CALENDARS, loading: false });
        return;
      }
      setSnapshot({
        connected: !!data.connected,
        email: data.email ?? null,
        events: Array.isArray(data.events) ? (data.events as CalendarEvent[]) : EMPTY,
        calendars: Array.isArray(data.calendars) ? (data.calendars as GoogleCalendarMeta[]) : NO_CALENDARS,
        loading: false,
      });
    })
    .finally(() => { inflight = null; });
  return inflight;
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => { subscribers.delete(notify); };
}

// Reads the user's Google Calendar (read-only) for the current week via the
// google-calendar edge function. Degrades gracefully: if the function/tokens
// aren't set up, it simply returns connected=false with no events.
export function useGoogleCalendar(): GoogleCalendarState {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

  useEffect(() => { fetchEvents(); }, []);

  // Force a re-fetch even if one just finished (the shared promise is cleared
  // on settle, so this always starts fresh work rather than joining a stale one).
  const refresh = useCallback(() => { fetchEvents(); }, []);

  return { ...state, refresh };
}
