import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { layoutDay, hourWindow, fmtHour, fmtRange, fmtDuration } from '../lib/calendarLayout';
import { sessionBlocks, colorForSession, hoursByDay, totalHours, weekFrom } from '../lib/taskSessions';
import type { SessionBlock } from '../lib/taskSessions';
import { startOfDay, dateKey } from '../lib/taskStats';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Re-renders once a minute. A running block grows toward the current time and
 * the now-line has to move, but a per-second tick would re-pack the whole
 * overlap layout sixty times a minute to move it by a third of a pixel.
 */
function useMinuteTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Line the tick up with the start of the next minute rather than drifting
    // by however long after a minute boundary the page happened to load.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => { setNow(Date.now()); schedule(); }, 60_000 - (Date.now() % 60_000));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

interface BlockProps {
  block: SessionBlock;
  left: number;
  width: number;
  crowded: boolean;
  z: number;
  startH: number;
  hourPx: number;
  color: ReturnType<typeof colorForSession>;
  onOpen: (b: SessionBlock) => void;
}

function Block({ block: b, left, width, crowded, z, startH, hourPx, color, onOpen }: BlockProps) {
  const top = (b.start - startH) * hourPx;
  const h = Math.max((b.end - b.start) * hourPx, 13);
  const spanMs = b.spanEnd.getTime() - b.spanStart.getTime();
  const tip =
    `${b.title} · ${fmtRange(b.start, b.end)} · ${fmtDuration(spanMs / 3_600_000)}` +
    (b.running ? ' · running' : '') +
    (b.continuedFrom || b.continuesInto ? ' · spans midnight' : '');

  return (
    <button
      onClick={() => onOpen(b)}
      title={tip}
      aria-label={tip}
      className="pos-event absolute text-left px-1 py-[1px] overflow-hidden"
      style={{
        top,
        height: h,
        left: `calc(${left * 100}% + 1px)`,
        width: `calc(${width * 100}% - 2px)`,
        background: crowded ? color.bgSolid : color.bg,
        borderLeft: `${crowded ? 3 : 2}px solid ${color.bar}`,
        // Square off the edge a stint runs through, so a block crossing
        // midnight reads as one piece of work split over two columns.
        borderTopLeftRadius: b.continuedFrom ? 0 : 4,
        borderTopRightRadius: b.continuedFrom ? 0 : 4,
        borderBottomLeftRadius: b.continuesInto ? 0 : 4,
        borderBottomRightRadius: b.continuesInto ? 0 : 4,
        boxShadow: crowded ? '0 0 0 1px var(--bg-card)' : undefined,
        zIndex: 4 + z,
      }}
    >
      <div className="flex items-center gap-1">
        {b.running && (
          <span
            className="w-1 h-1 rounded-full shrink-0 animate-pulse"
            style={{ background: color.dot }}
          />
        )}
        <span className="text-[9.5px] leading-[1.15] text-[var(--t1)] truncate">{b.title}</span>
      </div>
      {h >= 30 && (
        <div className="text-[9px] leading-tight text-[var(--t3)] truncate tnum">
          {fmtDuration(b.end - b.start)}
          {width > 0.45 ? ` · ${fmtHour(b.start)}` : ''}
        </div>
      )}
    </button>
  );
}

export function TimeCalendar({ page = false }: { page?: boolean }) {
  const { sessions, projects, tasks, setModal } = useDashboard();
  const [view, setView] = useState('Week');
  // Any date inside the range on screen; the nav buttons shift it.
  const [anchorMs, setAnchorMs] = useState(() => startOfDay(new Date()).getTime());
  const now = useMinuteTick();

  const days = useMemo(() => {
    const anchor = new Date(anchorMs);
    return view === 'Week' ? weekFrom(anchor) : [startOfDay(anchor)];
  }, [anchorMs, view]);

  const blocks = useMemo(() => sessionBlocks(sessions, days, now), [sessions, days, now]);
  const [startH, endH] = hourWindow(blocks, [8, 21]);
  const byDay = useMemo(
    () => days.map((_, i) => layoutDay(blocks.filter(b => b.dayIndex === i))),
    [blocks, days],
  );
  const perDay = useMemo(() => hoursByDay(blocks, days.length), [blocks, days.length]);

  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  // Density adapts to the span on screen. Tracked time is not office hours —
  // one 11pm session stretches the window across the whole day, and at a fixed
  // row height that turns the grid into a mostly-empty 1100px scroll. Fitting
  // the span into a target height instead keeps the week readable at a glance,
  // with a floor so an all-day span stays legible.
  const span = Math.max(1, endH - startH);
  const hourPx = Math.round(Math.min(page ? 46 : 34, Math.max(20, (page ? 620 : 380) / span)));
  const gutter = page ? 46 : 34;
  const todayKeyStr = dateKey(new Date(now));
  const nowDate = new Date(now);
  const nowH = nowDate.getHours() + nowDate.getMinutes() / 60;

  const shift = (dir: -1 | 1) => setAnchorMs(ms => {
    const d = new Date(ms);
    d.setDate(d.getDate() + dir * (view === 'Week' ? 7 : 1));
    return startOfDay(d).getTime();
  });

  const openTask = (b: SessionBlock) => {
    // The task is hard-deleted a day after it's finished, but its sessions
    // stay. Only offer the modal while there's something to open.
    if (b.taskId && tasks.some(t => t.id === b.taskId)) setModal({ kind: 'task', taskId: b.taskId });
  };

  const rangeLabel = days.length === 1
    ? days[0].toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    : `${days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${
        days[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  const isCurrent = days.some(d => dateKey(d) === todayKeyStr);
  const cols = `${gutter}px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <Card
      title="Time tracked"
      kicker={totalHours(blocks) > 0 ? fmtDuration(totalHours(blocks)) : 'nothing yet'}
      // Only the tabs live in the header: Card pins its action row with
      // shrink-0, so anything more forces the whole card wider than a phone.
      action={<Tabs tabs={['Day', 'Week']} value={view} onChange={setView} />}
    >
      {/* Range and its navigation belong together, and here they can wrap. */}
      <div className="mb-2 flex items-center flex-wrap gap-x-2 gap-y-1">
        <button onClick={() => shift(-1)} aria-label="Previous"
          className="w-5 h-5 shrink-0 grid place-items-center rounded-md text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors">‹</button>
        <button onClick={() => shift(1)} aria-label="Next"
          className="w-5 h-5 shrink-0 grid place-items-center rounded-md text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors">›</button>
        <span className="text-[10.5px] text-[var(--t3)] tnum">{rangeLabel}</span>
        {!isCurrent && (
          <button
            onClick={() => setAnchorMs(startOfDay(new Date()).getTime())}
            className="px-2 py-0.5 rounded-md border border-[var(--line)] text-[10px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <div className="flex flex-col">
        <div className="grid text-[10.5px] text-[var(--t3)] pb-1.5 border-b border-[var(--line)]"
          style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d, i) => {
            const isToday = dateKey(d) === todayKeyStr;
            return (
              <div key={dateKey(d)} className="px-1 text-center">
                <div className={`tnum ${isToday ? 'text-[var(--t1)] font-medium' : ''}`}>
                  {days.length === 1 ? d.toLocaleDateString([], { weekday: 'short' }) : DOW[i]}
                </div>
                <div className={`tnum ${isToday
                  ? 'text-[var(--bg)] bg-[var(--accent)] rounded-full w-[18px] h-[18px] leading-[18px] mx-auto mt-0.5'
                  : 'mt-0.5'}`}>
                  {d.getDate()}
                </div>
                {/* The day's total, so the week reads as a bar chart of effort
                    as well as a calendar. */}
                <div className="mt-0.5 text-[9px] tnum text-[var(--t4)]">
                  {perDay[i] > 0 ? fmtDuration(perDay[i]) : '·'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid relative" style={{ gridTemplateColumns: cols }}>
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: hourPx }}
                className="text-[9.5px] text-[var(--t4)] pr-1.5 text-right tnum -translate-y-1">
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const isToday = dateKey(d) === todayKeyStr;
            return (
              <div key={dateKey(d)}
                className={`relative border-l border-[var(--line)]/60 ${isToday ? 'bg-[var(--accent-2)]/40' : ''}`}>
                {hours.map(h => (
                  <div key={h} style={{ height: hourPx }} className="border-b border-[var(--line)]/30">
                    {hourPx >= 38 && <div className="h-1/2 border-b border-[var(--line)]/15" />}
                  </div>
                ))}

                {byDay[dayIdx].map(({ event: b, left, width, clusterSize, z }) => (
                  <Block
                    key={b.id}
                    block={b}
                    left={left}
                    width={width}
                    crowded={clusterSize > 1}
                    z={z}
                    startH={startH}
                    hourPx={hourPx}
                    color={colorForSession(b, projects)}
                    onOpen={openTask}
                  />
                ))}

                {isToday && nowH >= startH && nowH <= endH && (
                  <div className="absolute inset-x-0 border-t border-[var(--accent)] pointer-events-none"
                    style={{ top: (nowH - startH) * hourPx, zIndex: 15 }}>
                    <span className="absolute -left-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="mt-4 text-center text-[11px] text-[var(--t4)]">
          No tracked time here. Hit ▶ on a task and its block appears on this grid.
        </div>
      )}
    </Card>
  );
}
