import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent } from '../types';

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
  loading: boolean;
  refresh: () => void;
}

// Reads the user's Google Calendar (read-only) for the current week via the
// google-calendar edge function. Degrades gracefully: if the function/tokens
// aren't set up, it simply returns connected=false with no events.
export function useGoogleCalendar(): GoogleCalendarState {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Promise-based (state updates happen in the async .then callback, never
  // synchronously in the effect body).
  const load = useCallback(() => {
    supabase.functions
      .invoke('google-calendar', { body: { weekStart: currentMondayStr() } })
      .then(({ data, error }) => {
        if (error || !data || data.error) {
          setConnected(false);
          setEmail(null);
          setEvents([]);
          setLoading(false);
          return;
        }
        setConnected(!!data.connected);
        setEmail(data.email ?? null);
        setEvents(Array.isArray(data.events) ? (data.events as CalendarEvent[]) : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { connected, email, events, loading, refresh: load };
}
