import { useMemo, useState } from 'react';
import { SEED_DATA } from '../data/seed';
import { useMergedCalendarEvents } from '../hooks/usePhysical';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useWidgetSize } from '../context/WidgetSizeContext';
import { layoutDay, hourWindow, fmtHour, fmtRange, fmtDuration } from '../lib/calendarLayout';
import type { CalendarEvent } from '../types';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';
import { EventDetailModal } from './modals/EventDetailModal';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface KindColor { dot: string; bar: string; bg: string; bgSolid: string }

const KIND_COLORS: Record<string, KindColor> = {
  class:          { dot: '#93c5fd', bar: 'rgba(147,197,253,0.7)',  bg: 'rgba(147,197,253,0.08)', bgSolid: 'rgba(147,197,253,0.17)' },
  career:         { dot: '#c4b5fd', bar: 'rgba(196,181,253,0.7)',  bg: 'rgba(196,181,253,0.08)', bgSolid: 'rgba(196,181,253,0.17)' },
  personal:       { dot: '#f5c451', bar: 'rgba(245,196,81,0.7)',   bg: 'rgba(245,196,81,0.08)',  bgSolid: 'rgba(245,196,81,0.17)'  },
  work:           { dot: '#6ee7b7', bar: 'rgba(110,231,183,0.7)',  bg: 'rgba(110,231,183,0.08)', bgSolid: 'rgba(110,231,183,0.17)' },
  workout:        { dot: '#f4a8b7', bar: 'rgba(244,168,183,0.75)', bg: 'rgba(244,168,183,0.10)', bgSolid: 'rgba(244,168,183,0.19)' },
  'workout-run':  { dot: '#fdba74', bar: 'rgba(253,186,116,0.75)', bg: 'rgba(253,186,116,0.10)', bgSolid: 'rgba(253,186,116,0.19)' },
};

const colorFor = (kind: string): KindColor => KIND_COLORS[kind] ?? KIND_COLORS.work;

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

/** Ids of every event that shares its time slot with another event that day. */
function conflictIds(events: CalendarEvent[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      if (a.day === b.day && a.start < b.end && b.start < a.end) { out.add(a.id); out.add(b.id); }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ week */

interface WeekProps {
  events: CalendarEvent[];
  startH: number;
  endH: number;
  hourPx: number;
  wide: boolean;
  sticky: boolean;
  selectedId?: string;
  onSelect: (e: CalendarEvent) => void;
  onPickDay: (day: number) => void;
}

function CalendarWeek({ events, startH, endH, hourPx, wide, sticky, selectedId, onSelect, onPickDay }: WeekProps) {
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const now = new Date();
  const todayIdx = todayIndex(now);
  const dates = weekDates(now);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const gutter = wide ? 46 : 34;
  const cols = `${gutter}px repeat(7, minmax(0, 1fr))`;
  const halfHours = hourPx >= 38;

  const byDay = useMemo(
    () => Array.from({ length: 7 }, (_, d) => layoutDay(events.filter(e => e.day === d))),
    [events],
  );

  return (
    <div className="flex flex-col">
      <div
        className={`grid text-[10.5px] text-[var(--t3)] pb-1.5 border-b border-[var(--line)] ${
          sticky ? 'sticky top-0 z-30 bg-[var(--bg-card)]' : ''
        }`}
        style={{ gridTemplateColumns: cols }}
      >
        <div />
        {DOW.map((d, i) => (
          <button
            key={d}
            onClick={() => onPickDay(i)}
            title={`View ${dates[i].toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}`}
            className={`px-1 py-0.5 mx-0.5 rounded-md text-center transition-colors hover:bg-[var(--bg-card-hi)] ${
              i === todayIdx ? 'text-[var(--t1)]' : ''
            }`}
          >
            <span className={`tnum ${i === todayIdx ? 'font-medium' : ''}`}>{d}</span>
            <span
              className={`block tnum ${
                i === todayIdx
                  ? 'text-[var(--bg)] bg-[var(--accent)] rounded-full w-[18px] h-[18px] leading-[18px] mx-auto mt-0.5'
                  : 'mt-0.5'
              }`}
            >
              {dates[i].getDate()}
            </span>
          </button>
        ))}
      </div>

      <div className="grid relative" style={{ gridTemplateColumns: cols }}>
        <div>
          {hours.map(h => (
            <div
              key={h}
              style={{ height: hourPx }}
              className="text-[9.5px] text-[var(--t4)] pr-1.5 text-right tnum -translate-y-1"
            >
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {Array.from({ length: 7 }, (_, day) => (
          <div
            key={day}
            className={`relative border-l border-[var(--line)]/60 ${
              day === todayIdx ? 'bg-[var(--accent-2)]/40' : ''
            }`}
          >
            {hours.map(h => (
              <div key={h} style={{ height: hourPx }} className="border-b border-[var(--line)]/30">
                {halfHours && <div className="h-1/2 border-b border-[var(--line)]/15" />}
              </div>
            ))}

            {byDay[day].map(({ event: e, left, width, clusterSize, z }) => {
              const top = (e.start - startH) * hourPx;
              const h = Math.max((e.end - e.start) * hourPx, 13);
              const c = colorFor(e.kind);
              const crowded = clusterSize > 1;
              return (
                <button
                  key={e.id}
                  onClick={() => onSelect(e)}
                  title={`${e.title} · ${fmtRange(e.start, e.end)}${e.loc ? ` · ${e.loc}` : ''}`}
                  className={`pos-event absolute text-left rounded-[4px] px-1 py-[1px] overflow-hidden ${
                    selectedId === e.id ? 'pos-event-selected' : ''
                  }`}
                  style={{
                    top,
                    height: h,
                    left: `calc(${left * 100}% + 1px)`,
                    width: `calc(${width * 100}% - 2px)`,
                    background: crowded ? c.bgSolid : c.bg,
                    borderLeft: `${crowded ? 3 : 2}px solid ${c.bar}`,
                    boxShadow: crowded ? '0 0 0 1px var(--bg-card)' : undefined,
                    zIndex: 4 + z,
                  }}
                >
                  <div className="text-[9.5px] leading-[1.15] text-[var(--t1)] truncate">{e.title}</div>
                  {h >= 30 && (
                    <div className="text-[9px] leading-tight text-[var(--t3)] truncate tnum">
                      {fmtHour(e.start)}
                      {e.loc && width > 0.45 ? ` · ${e.loc}` : ''}
                    </div>
                  )}
                </button>
              );
            })}

            {day === todayIdx && nowH >= startH && nowH <= endH && (
              <div
                className="absolute inset-x-0 border-t border-[var(--accent)] pointer-events-none"
                style={{ top: (nowH - startH) * hourPx, zIndex: 15 }}
              >
                <span className="absolute -left-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              </div>
            )}
          </div>
        ))}

        {nowH >= startH && nowH <= endH && (
          <div
            className="absolute left-0 text-[9px] tnum text-[var(--bg)] bg-[var(--accent)] rounded px-1 pointer-events-none"
            style={{ top: (nowH - startH) * hourPx - 7, width: gutter - 6, zIndex: 16 }}
          >
            {fmtHour(nowH, { pad: true })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- day */

interface DayProps {
  events: CalendarEvent[];
  dayIdx: number;
  onPickDay: (day: number) => void;
  onSelect: (e: CalendarEvent) => void;
  selectedId?: string;
  showPicker?: boolean;
}

function CalendarDay({ events, dayIdx, onPickDay, onSelect, selectedId, showPicker = true }: DayProps) {
  const dates = weekDates();
  const today = todayIndex();
  const list = events.filter(e => e.day === dayIdx).sort((a, b) => a.start - b.start || a.end - b.end);
  const conflicts = useMemo(() => conflictIds(list), [list]);
  const booked = list.reduce((s, e) => s + (e.end - e.start), 0);

  return (
    <div className="flex flex-col gap-2.5">
      {showPicker && (
        <div className="grid grid-cols-7 gap-1">
          {DOW.map((d, i) => (
            <button
              key={d}
              onClick={() => onPickDay(i)}
              className={`py-1 rounded-md text-center transition-colors border ${
                i === dayIdx
                  ? 'border-[var(--line-hi)] bg-[var(--bg-card-hi)] text-[var(--t1)]'
                  : 'border-transparent text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[var(--bg-elev)]'
              }`}
            >
              <span className="block text-[9.5px] uppercase tracking-[0.08em]">{d[0]}</span>
              <span className={`block text-[11.5px] tnum ${i === today ? 'text-[var(--accent)]' : ''}`}>
                {dates[i].getDate()}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10.5px] text-[var(--t3)] tnum">
        <span>{dates[dayIdx].toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        <span>
          {list.length} event{list.length === 1 ? '' : 's'}
          {list.length > 0 && ` · ${fmtDuration(booked)}`}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="text-[11.5px] text-[var(--t4)] py-6 text-center">Nothing scheduled.</div>
      ) : (
        <ul className="space-y-0.5">
          {list.map(e => {
            const c = colorFor(e.kind);
            return (
              <li key={e.id}>
                <button
                  onClick={() => onSelect(e)}
                  className={`w-full flex gap-2.5 items-stretch text-left rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[var(--bg-card-hi)] ${
                    selectedId === e.id ? 'bg-[var(--bg-card-hi)]' : ''
                  }`}
                >
                  <div className="text-[10.5px] tnum text-[var(--t3)] pt-0.5 w-14 shrink-0">{fmtHour(e.start)}</div>
                  <div className="w-[2px] rounded-full shrink-0" style={{ background: c.bar }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-[var(--t1)] leading-tight truncate">{e.title}</div>
                    <div className="text-[10.5px] text-[var(--t3)] flex items-center gap-1.5 flex-wrap">
                      <span className="tnum">{fmtRange(e.start, e.end)}</span>
                      {e.loc && <><span className="text-[var(--t4)]">·</span><span className="truncate">{e.loc}</span></>}
                      {conflicts.has(e.id) && (
                        <span className="text-[9.5px] px-1 rounded bg-[var(--amber)]/12 text-[var(--amber)]">overlap</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- month */

function CalendarMonth({
  events,
  wide,
  onPickDate,
}: {
  events: CalendarEvent[];
  wide: boolean;
  onPickDate: (weekday: number) => void;
}) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const leadBlanks = (first.getDay() + 6) % 7; // Monday-start offset
  const cellCount = Math.ceil((leadBlanks + daysInMonth) / 7) * 7;

  // Events repeat weekly (day = 0..6), so a date inherits its weekday's events.
  const byWeekday = useMemo(
    () => Array.from({ length: 7 }, (_, wd) => events.filter(e => e.day === wd).sort((a, b) => a.start - b.start)),
    [events],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-[var(--t4)] uppercase tracking-[0.1em]">
        {DOW.map(d => <div key={d} className="text-center">{wide ? d : d[0]}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: cellCount }, (_, i) => {
          const dn = i - leadBlanks + 1;
          const inMonth = dn >= 1 && dn <= daysInMonth;
          const weekday = i % 7;
          const dayEvents = inMonth ? byWeekday[weekday] : [];
          const isToday = inMonth && dn === now.getDate();
          return (
            <button
              key={i}
              disabled={!inMonth}
              onClick={() => onPickDate(weekday)}
              title={inMonth ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : undefined}
              className={`text-left rounded-md p-1 border transition-colors ${wide ? 'min-h-[74px]' : 'aspect-square'} ${
                isToday ? 'border-[var(--accent)] bg-[var(--accent-2)]' : 'border-[var(--line)]/60'
              } ${inMonth ? 'hover:border-[var(--line-hi)] hover:bg-[var(--bg-card-hi)]' : 'opacity-30'}`}
            >
              <div className={`text-[10.5px] tnum ${isToday ? 'text-[var(--t1)] font-medium' : 'text-[var(--t3)]'}`}>
                {inMonth ? dn : ''}
              </div>
              {wide ? (
                <div className="mt-0.5 space-y-[2px]">
                  {dayEvents.slice(0, 3).map(e => {
                    const c = colorFor(e.kind);
                    return (
                      <div
                        key={e.id}
                        className="text-[9px] leading-[1.25] truncate rounded-[3px] px-1"
                        style={{ background: c.bg, color: c.dot }}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-[var(--t4)] px-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              ) : (
                <div className="flex gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map(e => (
                    <span key={e.id} className="w-1 h-1 rounded-full" style={{ background: colorFor(e.kind).dot }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ root */

export function Calendar({ page = false }: { page?: boolean }) {
  const [view, setView] = useState('Week');
  const [selectedDay, setSelectedDay] = useState(() => todayIndex());
  const [active, setActive] = useState<CalendarEvent | null>(null);

  const { connected, events: googleEvents, loading } = useGoogleCalendar();
  const baseEvents = useMemo(() => [...SEED_DATA.events, ...googleEvents], [googleEvents]);
  const events = useMergedCalendarEvents(baseEvents);

  const size = useWidgetSize();
  const wide = page || (size?.cols ?? 1) >= 2;
  const [startH, endH] = useMemo(() => hourWindow(events), [events]);

  // Vertical density: the page view is roomy, a widget grows into whatever
  // height the user dragged it to and scrolls past that.
  const fixedHeight = size?.fixedHeight ?? false;
  const boxHeight = size?.height ?? 0;
  const hourPx = useMemo(() => {
    const base = page ? 44 : wide ? 30 : 22;
    if (page || !fixedHeight) return base;
    return Math.max(base, Math.min(64, (boxHeight - 132) / Math.max(1, endH - startH)));
  }, [page, wide, fixedHeight, boxHeight, startH, endH]);

  const dates = weekDates();
  const shortDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const kicker =
    view === 'Month'
      ? new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })
      : view === 'Day'
        ? dates[selectedDay].toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
        : `${shortDate(dates[0])} — ${shortDate(dates[6])}`;

  const openDay = (day: number) => { setSelectedDay(day); setView('Day'); };

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

  const action = (
    <div className="flex items-center gap-2">
      {gcalBadge}
      {wide && (view !== 'Week' || selectedDay !== todayIndex()) && (
        <button
          onClick={() => { setSelectedDay(todayIndex()); setView('Week'); }}
          className="text-[11px] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
        >
          Today
        </button>
      )}
      <Tabs tabs={['Day', 'Week', 'Month']} value={view} onChange={setView} />
    </div>
  );

  const body = (
    <>
      {view === 'Day' && (
        <CalendarDay
          events={events}
          dayIdx={selectedDay}
          onPickDay={setSelectedDay}
          onSelect={setActive}
          selectedId={active?.id}
        />
      )}
      {view === 'Week' && (
        <CalendarWeek
          events={events}
          startH={startH}
          endH={endH}
          hourPx={hourPx}
          wide={wide}
          sticky={page || fixedHeight}
          selectedId={active?.id}
          onSelect={setActive}
          onPickDay={openDay}
        />
      )}
      {view === 'Month' && <CalendarMonth events={events} wide={wide} onPickDate={openDay} />}
    </>
  );

  const modal = active && (
    <EventDetailModal
      event={active}
      allEvents={events}
      color={colorFor(active.kind)}
      weekDate={dates[active.day]}
      onClose={() => setActive(null)}
      onViewDay={openDay}
    />
  );

  if (page) {
    return (
      <>
        <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_308px]">
          <Card title="Calendar" kicker={kicker} action={action}>
            <div className="overflow-y-auto pos-scroll" style={{ maxHeight: 'calc(100vh - 210px)' }}>
              {body}
            </div>
          </Card>
          <div className="hidden xl:block">
            <Card
              title="Agenda"
              kicker={selectedDay === todayIndex() ? 'Today' : undefined}
            >
              <div className="overflow-y-auto pos-scroll" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <CalendarDay
                  events={events}
                  dayIdx={selectedDay}
                  onPickDay={setSelectedDay}
                  onSelect={setActive}
                  selectedId={active?.id}
                />
              </div>
            </Card>
          </div>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <Card title="Calendar" kicker={kicker} action={action}>
        {body}
      </Card>
      {modal}
    </>
  );
}
