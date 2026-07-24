import { useState, useMemo } from 'react';
import { SEED_DATA } from '../data/seed';
import { useMergedCalendarEvents } from '../hooks/usePhysical';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import type { CalendarEvent } from '../types';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const KIND_COLORS: Record<string, { dot: string; bar: string; bg: string }> = {
  class:          { dot: '#93c5fd', bar: 'rgba(147,197,253,0.7)',  bg: 'rgba(147,197,253,0.08)' },
  career:         { dot: '#c4b5fd', bar: 'rgba(196,181,253,0.7)',  bg: 'rgba(196,181,253,0.08)' },
  personal:       { dot: '#f5c451', bar: 'rgba(245,196,81,0.7)',   bg: 'rgba(245,196,81,0.08)'  },
  work:           { dot: '#6ee7b7', bar: 'rgba(110,231,183,0.7)',  bg: 'rgba(110,231,183,0.08)' },
  workout:        { dot: '#f4a8b7', bar: 'rgba(244,168,183,0.75)', bg: 'rgba(244,168,183,0.10)' },
  'workout-run':  { dot: '#fdba74', bar: 'rgba(253,186,116,0.75)', bg: 'rgba(253,186,116,0.10)' },
};

// Monday-start index of today (0 = Mon … 6 = Sun)
function todayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

function mondayOfWeek(d = new Date()) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - todayIndex(d));
  return m;
}

function weekDates(d = new Date()) {
  const mon = mondayOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day;
  });
}

function CalendarWeek({ events, compact }: { events: CalendarEvent[]; compact?: boolean }) {
  const hourPx = compact ? 18 : 22;
  const startH = 8, endH = 21;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
  const now = new Date();
  const todayIdx = todayIndex(now);
  const dates = weekDates(now);
  const nowH = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[34px_repeat(7,1fr)] text-[10.5px] text-[var(--t3)] pb-1 border-b border-[var(--line)]">
        <div />
        {DOW.map((d, i) => (
          <div key={d} className="px-1 text-center">
            <span className={`tnum ${i === todayIdx ? 'text-[var(--t1)] font-medium' : ''}`}>{d}</span>
            <span className={`block tnum ${i === todayIdx ? 'text-[var(--t1)]' : ''}`}>{dates[i].getDate()}</span>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="grid grid-cols-[34px_repeat(7,1fr)] relative">
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: hourPx }} className="text-[9.5px] text-[var(--t4)] pr-1 text-right tnum">
                {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="relative border-l border-[var(--line)]/60">
              {hours.map(h => <div key={h} style={{ height: hourPx }} className="border-b border-[var(--line)]/30" />)}
              {events.filter(e => e.day === day).map(e => {
                const top = (e.start - startH) * hourPx;
                const h = (e.end - e.start) * hourPx;
                const c = KIND_COLORS[e.kind] || KIND_COLORS.work;
                return (
                  <div
                    key={e.id}
                    className="absolute inset-x-0.5 rounded-[3px] px-1 py-0.5 overflow-hidden"
                    style={{ top, height: h, background: c.bg, borderLeft: `2px solid ${c.bar}` }}
                  >
                    <div className="text-[9.5px] leading-tight text-[var(--t1)] truncate">{e.title}</div>
                    {h >= 26 && <div className="text-[9px] text-[var(--t3)] truncate">{e.loc}</div>}
                  </div>
                );
              })}
              {day === todayIdx && nowH >= startH && nowH <= endH + 1 && (
                <div className="absolute inset-x-0 border-t border-[var(--accent)]" style={{ top: (nowH - startH) * hourPx }}>
                  <span className="absolute -left-1 -top-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarDay({ events }: { events: CalendarEvent[] }) {
  const todays = events.filter(e => e.day === todayIndex()).sort((a, b) => a.start - b.start);
  if (todays.length === 0) {
    return <div className="text-[11.5px] text-[var(--t4)] py-3 text-center">Nothing scheduled today.</div>;
  }
  return (
    <ul className="space-y-1.5">
      {todays.map(e => {
        const c = KIND_COLORS[e.kind] || KIND_COLORS.work;
        const dur = e.end - e.start;
        const hr = Math.floor(e.start);
        const min = e.start % 1 ? ':30' : ':00';
        const startLabel = hr >= 12 ? `${hr === 12 ? 12 : hr - 12}${min}p` : `${hr}${min}a`;
        return (
          <li key={e.id} className="flex gap-3 items-start">
            <div className="text-[10.5px] tnum text-[var(--t3)] pt-0.5 w-12 shrink-0">{startLabel}</div>
            <div className="w-px self-stretch" style={{ background: c.bar, opacity: 0.6 }} />
            <div className="flex-1 pb-1.5 min-w-0">
              <div className="text-[12.5px] text-[var(--t1)] leading-tight truncate">{e.title}</div>
              <div className="text-[10.5px] text-[var(--t3)] flex items-center gap-1.5">
                <span>{e.loc}</span>
                <span className="text-[var(--t4)]">·</span>
                <span className="tnum">{dur < 1 ? `${dur * 60}m` : `${dur}h`}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CalendarMonth({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const leadBlanks = (first.getDay() + 6) % 7; // Monday-start offset
  const cellCount = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;
  // All events are weekly-recurring (day = 0..6), so each weekday repeats its count
  const countByWeekday = Array.from({ length: 7 }, (_, wd) => events.filter(e => e.day === wd).length);

  const cells = Array.from({ length: cellCount }, (_, i) => {
    const dn = i - leadBlanks + 1;
    const inMonth = dn >= 1 && dn <= daysInMonth;
    return {
      dn,
      inMonth,
      evCount: inMonth ? countByWeekday[i % 7] : 0,
      today: inMonth && dn === now.getDate(),
    };
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-[var(--t4)] uppercase tracking-[0.1em]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`aspect-square rounded-md p-1 border ${c.today ? 'border-[var(--accent)] bg-[var(--accent-2)]' : 'border-[var(--line)]/60'} ${c.inMonth ? '' : 'opacity-30'}`}
          >
            <div className={`text-[10.5px] tnum ${c.today ? 'text-[var(--t1)] font-medium' : 'text-[var(--t3)]'}`}>
              {c.inMonth ? c.dn : ''}
            </div>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: Math.min(c.evCount, 3) }, (_, k) => (
                <span key={k} className="w-1 h-1 rounded-full" style={{ background: ['#93c5fd', '#c4b5fd', '#f5c451'][k] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Calendar() {
  const [view, setView] = useState('Week');
  const { connected, events: googleEvents, loading } = useGoogleCalendar();
  const baseEvents = useMemo(
    () => [...SEED_DATA.events, ...googleEvents],
    [googleEvents],
  );
  const events = useMergedCalendarEvents(baseEvents);

  const dates = weekDates();
  const shortDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const kicker = view === 'Month'
    ? new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })
    : `${shortDate(dates[0])} — ${shortDate(dates[6])}`;

  const gcalBadge = loading ? null : connected ? (
    <span
      className="flex items-center gap-1 text-[10px] text-[var(--green)] px-1.5 py-0.5 rounded-full bg-[var(--green)]/10"
      title="Google Calendar connected"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" /> GCal
    </span>
  ) : (
    <a href="/settings" className="text-[10px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors" title="Connect Google Calendar">
      + Google Calendar
    </a>
  );

  return (
    <Card
      title="Calendar"
      kicker={kicker}
      action={
        <div className="flex items-center gap-2">
          {gcalBadge}
          <Tabs tabs={['Day', 'Week', 'Month']} value={view} onChange={setView} />
        </div>
      }
    >
      <div>
        {view === 'Day'   && <CalendarDay events={events} />}
        {view === 'Week'  && <CalendarWeek events={events} compact={false} />}
        {view === 'Month' && <CalendarMonth events={events} />}
      </div>
    </Card>
  );
}
