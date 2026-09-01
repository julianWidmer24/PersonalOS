import { useEffect } from 'react';
import type { CalendarEvent } from '../../types';
import { ModalShell } from '../shared/ModalShell';
import { fmtRange, fmtDuration } from '../../lib/calendarLayout';

const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const KIND_LABEL: Record<string, string> = {
  class: 'Class',
  career: 'Career',
  personal: 'Personal',
  work: 'Work',
  workout: 'Workout',
  'workout-run': 'Run',
};

interface EventDetailModalProps {
  event: CalendarEvent;
  /** every event in the week — used to surface scheduling conflicts */
  allEvents: CalendarEvent[];
  color: { dot: string; bar: string; bg: string };
  weekDate: Date;
  onClose: () => void;
  onViewDay: (day: number) => void;
}

export function EventDetailModal({ event, allEvents, color, weekDate, onClose, onViewDay }: EventDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const conflicts = allEvents.filter(
    e => e.id !== event.id && e.day === event.day && e.start < event.end && event.start < e.end,
  );

  const source = event._derived ? 'Workout routine' : 'Google Calendar';

  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color.dot }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] leading-snug text-[var(--t1)] font-medium">{event.title}</h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{ background: color.bg, color: color.dot }}
              >
                {KIND_LABEL[event.kind] ?? event.kind}
              </span>
              <span className="text-[11px] text-[var(--t3)]">{source}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 rounded-md grid place-items-center text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        <dl className="mt-4 space-y-2.5 text-[12.5px]">
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[var(--t3)]">When</dt>
            <dd className="text-[var(--t1)] tnum">
              {DOW_LONG[event.day]}, {weekDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-[var(--t3)]">Time</dt>
            <dd className="text-[var(--t1)] tnum">
              {fmtRange(event.start, event.end)}
              <span className="text-[var(--t3)]"> · {fmtDuration(event.end - event.start)}</span>
            </dd>
          </div>
          {event.calendar && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-[var(--t3)]">Calendar</dt>
              <dd className="text-[var(--t1)] break-words flex items-center gap-1.5">
                {event.calendarColor && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: event.calendarColor }}
                  />
                )}
                {event.calendar}
              </dd>
            </div>
          )}
          {event.loc && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-[var(--t3)]">Where</dt>
              <dd className="text-[var(--t1)] break-words">{event.loc}</dd>
            </div>
          )}
          {conflicts.length > 0 && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-[var(--amber)]">Overlaps</dt>
              <dd className="text-[var(--t2)] space-y-1">
                {conflicts.map(c => (
                  <div key={c.id} className="leading-tight">
                    {c.title} <span className="text-[var(--t3)] tnum">· {fmtRange(c.start, c.end)}</span>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => { onViewDay(event.day); onClose(); }}
            className="px-3 py-1.5 rounded-md text-[12px] text-[var(--t2)] border border-[var(--line)] hover:border-[var(--line-hi)] hover:text-[var(--t1)] transition-colors"
          >
            View day
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[12px] bg-[var(--bg-card-hi)] text-[var(--t1)] border border-[var(--line-hi)] hover:bg-[var(--line)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
