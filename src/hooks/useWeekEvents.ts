import { useMemo } from 'react';
import { SEED_DATA } from '../data/seed';
import { useGoogleCalendar } from './useGoogleCalendar';
import { useMergedCalendarEvents } from './usePhysical';
import type { CalendarEvent } from '../types';

/**
 * The current week's events exactly as the Calendar grid shows them: seeded
 * events + every Google calendar, with the workout routine layered on top.
 * Single source of truth so the grid and the next-up widget can't disagree.
 */
export function useWeekEvents(): { events: CalendarEvent[]; connected: boolean; loading: boolean } {
  const { connected, events: googleEvents, loading } = useGoogleCalendar();
  const baseEvents = useMemo(() => [...SEED_DATA.events, ...googleEvents], [googleEvents]);
  const events = useMergedCalendarEvents(baseEvents);
  return { events, connected, loading };
}

/** Monday-start index of a date (0 = Mon … 6 = Sun). */
export function todayIndex(d = new Date()): number {
  return (d.getDay() + 6) % 7;
}

/** Local midnight on the Monday of `d`'s week. */
export function mondayOfWeek(d = new Date()): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - todayIndex(d));
  return m;
}

/** Wall-clock Date for an event's start, from its (day, hour-float) pair. */
export function eventStartDate(e: CalendarEvent, ref = new Date()): Date {
  const d = mondayOfWeek(ref);
  d.setDate(d.getDate() + e.day);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + Math.round(e.start * 3600_000));
}

/** Wall-clock Date for an event's end. */
export function eventEndDate(e: CalendarEvent, ref = new Date()): Date {
  const d = mondayOfWeek(ref);
  d.setDate(d.getDate() + e.day);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + Math.round(e.end * 3600_000));
}
