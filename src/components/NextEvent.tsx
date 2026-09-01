import { useMemo, useState } from 'react';
import { useClock } from '../lib/dashboardHelpers';
import { useWeekEvents, eventStartDate, eventEndDate, mondayOfWeek } from '../hooks/useWeekEvents';
import { fmtRange, fmtDuration, fmtHour } from '../lib/calendarLayout';
import type { CalendarEvent } from '../types';
import { Card } from './shared/Card';
import { EventDetailModal } from './modals/EventDetailModal';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface KindColor { dot: string; bar: string; bg: string }

// Mirrors Calendar's palette so a block and its countdown read as the same event.
const KIND_COLORS: Record<string, KindColor> = {
  class:         { dot: '#93c5fd', bar: 'rgba(147,197,253,0.7)',  bg: 'rgba(147,197,253,0.08)' },
  career:        { dot: '#c4b5fd', bar: 'rgba(196,181,253,0.7)',  bg: 'rgba(196,181,253,0.08)' },
  personal:      { dot: '#f5c451', bar: 'rgba(245,196,81,0.7)',   bg: 'rgba(245,196,81,0.08)'  },
  work:          { dot: '#6ee7b7', bar: 'rgba(110,231,183,0.7)',  bg: 'rgba(110,231,183,0.08)' },
  workout:       { dot: '#f4a8b7', bar: 'rgba(244,168,183,0.75)', bg: 'rgba(244,168,183,0.10)' },
  'workout-run': { dot: '#fdba74', bar: 'rgba(253,186,116,0.75)', bg: 'rgba(253,186,116,0.10)' },
};
const colorFor = (kind: string): KindColor => KIND_COLORS[kind] ?? KIND_COLORS.work;

/**
 * Countdown as the largest two units that still matter — "2d 4h", "3h 12m",
 * "12m 30s", "45s". Seconds only appear under an hour, so the widget isn't
 * visibly repainting a digit that's three days away from mattering.
 */
function fmtCountdown(ms: number): string {
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

/** "today" / "tomorrow" / "Thu" — the day label above the countdown. */
function dayLabel(e: CalendarEvent, now: Date): string {
  const todayIdx = (now.getDay() + 6) % 7;
  if (e.day === todayIdx) return 'today';
  if (e.day === todayIdx + 1) return 'tomorrow';
  return DOW[e.day];
}

export function NextEvent() {
  const now = useClock();
  const { events, connected, loading } = useWeekEvents();
  const [active, setActive] = useState<CalendarEvent | null>(null);

  // Resolving (day, hour) → Date and sorting depends only on the event list, so
  // it stays out of the once-a-second clock tick below.
  const schedule = useMemo(
    () => events
      .map(e => ({ e, start: eventStartDate(e), end: eventEndDate(e) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events],
  );

  // In progress right now — shown as a "now" row rather than counted down to.
  const current = schedule.find(x => x.start <= now && now < x.end) ?? null;
  const upcoming = schedule.filter(x => x.start > now);

  const next = upcoming[0] ?? null;
  const then = upcoming.slice(1, 3);

  const body = (() => {
    if (loading) {
      return <div className="py-6 text-center text-[11.5px] text-[var(--t3)]">Loading calendar…</div>;
    }
    if (!next && !current) {
      return (
        <div className="py-6 text-center">
          <div className="text-[12.5px] text-[var(--t2)]">Nothing left this week</div>
          <div className="mt-1 text-[10.5px] text-[var(--t4)]">
            {connected ? 'Your calendar is clear.' : 'Connect Google Calendar in Settings.'}
          </div>
        </div>
      );
    }

    const c = colorFor((next ?? current).e.kind);

    return (
      <>
        {current && (
          <div
            onClick={() => setActive(current.e)}
            className="mb-3 flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors hover:brightness-125"
            style={{ background: colorFor(current.e.kind).bg }}
          >
            <span className="relative flex w-1.5 h-1.5 shrink-0">
              <span
                className="absolute inline-flex w-full h-full rounded-full opacity-70 animate-ping"
                style={{ background: colorFor(current.e.kind).dot }}
              />
              <span
                className="relative inline-flex w-1.5 h-1.5 rounded-full"
                style={{ background: colorFor(current.e.kind).dot }}
              />
            </span>
            <span className="text-[11.5px] text-[var(--t1)] truncate flex-1">{current.e.title}</span>
            <span className="text-[10.5px] tnum text-[var(--t3)] shrink-0">
              {fmtCountdown(current.end.getTime() - now.getTime())} left
            </span>
          </div>
        )}

        {next && (
          <div onClick={() => setActive(next.e)} className="cursor-pointer group">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t4)]">
              in
            </div>
            <div
              className="mt-0.5 text-[30px] leading-none tnum font-medium tabular-nums"
              style={{ color: c.dot }}
            >
              {fmtCountdown(next.start.getTime() - now.getTime())}
            </div>

            <div className="mt-2.5 flex items-start gap-2">
              <span
                className="mt-[5px] w-2 h-2 rounded-full shrink-0"
                style={{ background: c.dot }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-tight text-[var(--t1)] group-hover:text-[var(--accent)] transition-colors">
                  {next.e.title}
                </div>
                <div className="mt-0.5 text-[10.5px] tnum text-[var(--t3)]">
                  {dayLabel(next.e, now)} · {fmtRange(next.e.start, next.e.end)}
                  <span className="text-[var(--t4)]"> · {fmtDuration(next.e.end - next.e.start)}</span>
                </div>
                {(next.e.loc || next.e.calendar) && (
                  <div className="mt-0.5 text-[10.5px] text-[var(--t4)] truncate">
                    {next.e.loc}
                    {next.e.loc && next.e.calendar && ' · '}
                    {next.e.calendar}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {then.length > 0 && (
          <ul className="mt-3 pt-2.5 border-t border-[var(--line)]/60 space-y-1.5">
            {then.map(({ e }) => (
              <li
                key={e.id}
                onClick={() => setActive(e)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: colorFor(e.kind).dot }}
                />
                <span className="text-[11.5px] text-[var(--t2)] group-hover:text-[var(--t1)] truncate flex-1 transition-colors">
                  {e.title}
                </span>
                <span className="text-[10px] tnum text-[var(--t4)] shrink-0">
                  {dayLabel(e, now)} {fmtHour(e.start)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  })();

  const weekMonday = mondayOfWeek(now);

  return (
    <>
      <Card title="Next up" kicker={upcoming.length > 0 ? `${upcoming.length} left this week` : undefined}>
        {body}
      </Card>
      {active && (
        <EventDetailModal
          event={active}
          allEvents={events}
          color={colorFor(active.kind)}
          weekDate={new Date(weekMonday.getTime() + active.day * 86400_000)}
          onClose={() => setActive(null)}
          onViewDay={() => setActive(null)}
        />
      )}
    </>
  );
}
