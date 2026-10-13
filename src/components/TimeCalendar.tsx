import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { layoutDay, hourWindow, fmtHour, fmtRange, fmtDuration } from '../lib/calendarLayout';
import { sessionBlocks, colorForSession, hoursByDay, totalHours, weekFrom } from '../lib/taskSessions';
import type { SessionBlock } from '../lib/taskSessions';
import { startOfDay, dateKey } from '../lib/taskStats';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';
import { SessionModal } from './modals/SessionModal';
import type { SessionDraft, TaskSession } from '../types';

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
    (b.kind === 'waste' ? ' · wasted' : '') +
    (b.running ? ' · running' : '') +
    (b.continuedFrom || b.continuesInto ? ' · spans midnight' : '');

  return (
    <button
      // The column behind a block opens a new entry; this one edits the block.
      onClick={e => { e.stopPropagation(); onOpen(b); }}
      title={tip}
      aria-label={tip}
      className="pos-event absolute text-left px-1 py-[1px] overflow-hidden"
      style={{
        top,
        height: h,
        left: `calc(${left * 100}% + 1px)`,
        width: `calc(${width * 100}% - 2px)`,
        // Wasted time is hatched as well as red, so it reads at a glance as
        // not-work even beside a red project.
        background: b.kind === 'waste'
          ? `repeating-linear-gradient(-45deg, ${color.bgSolid} 0 4px, ${color.bg} 4px 8px)`
          : crowded ? color.bgSolid : color.bg,
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
        <span className="text-micro leading-[1.15] text-ink truncate">{b.title}</span>
      </div>
      {h >= 30 && (
        <div className="text-micro leading-tight text-ink-3 truncate tnum">
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
  const workBlocks = useMemo(() => blocks.filter(b => b.kind !== 'waste'), [blocks]);
  const wasteBlocks = useMemo(() => blocks.filter(b => b.kind === 'waste'), [blocks]);
  const perDay = useMemo(() => hoursByDay(workBlocks, days.length), [workBlocks, days.length]);
  const wastePerDay = useMemo(() => hoursByDay(wasteBlocks, days.length), [wasteBlocks, days.length]);
  const [editing, setEditing] = useState<TaskSession | SessionDraft | null>(null);

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

  const isCurrent = days.some(d => dateKey(d) === todayKeyStr);
  const openBlock = (b: SessionBlock) => {
    const s = sessions.find(x => x.id === b.sessionId);
    if (s) setEditing(s);
  };

  /** A fresh hour-long entry, starting at `hour` on `day` (or now-ish). */
  const draftAt = (day: Date, hour: number): SessionDraft => {
    const startD = new Date(day);
    startD.setHours(0, Math.floor(hour * 4) * 15, 0, 0);
    const endD = new Date(Math.min(startD.getTime() + 3_600_000, startOfDay(day).getTime() + 86_400_000 - 60_000));
    return { title: '', kind: 'task', tag: 'personal', startedAt: startD.toISOString(), endedAt: endD.toISOString() };
  };

  const onColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    setEditing(draftAt(day, Math.max(0, Math.min(23.75, startH + y / hourPx))));
  };

  const logNow = () => {
    // Default to the hour that just ended, on whichever day is on screen.
    const d = new Date(now);
    const day = days.find(x => dateKey(x) === dateKey(d)) ?? days[0];
    setEditing(draftAt(day, day === days[0] && !isCurrent ? 9 : Math.max(0, d.getHours() - 1)));
  };

  // The task is hard-deleted a day after it's finished, but its sessions
  // stay. The editor only offers it while there's something to open.
  const openTask = (taskId: string) => {
    if (tasks.some(t => t.id === taskId)) setModal({ kind: 'task', taskId });
  };

  const workTotal = totalHours(workBlocks);
  const wasteTotal = totalHours(wasteBlocks);
  const kicker = [
    workTotal > 0 ? fmtDuration(workTotal) : '',
    wasteTotal > 0 ? `${fmtDuration(wasteTotal)} wasted` : '',
  ].filter(Boolean).join(' · ') || 'nothing yet';

  const rangeLabel = days.length === 1
    ? days[0].toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    : `${days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${
        days[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  const cols = `${gutter}px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <Card
      title="Time tracked"
      kicker={kicker}
      // Only the tabs live in the header: Card pins its action row with
      // shrink-0, so anything more forces the whole card wider than a phone.
      action={<Tabs tabs={['Day', 'Week']} value={view} onChange={setView} />}
    >
      {/* Range and its navigation belong together, and here they can wrap. */}
      <div className="mb-2 flex items-center flex-wrap gap-x-2 gap-y-1">
        <button onClick={() => shift(-1)} aria-label="Previous"
          className="w-5 h-5 shrink-0 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-card-hi transition-colors">‹</button>
        <button onClick={() => shift(1)} aria-label="Next"
          className="w-5 h-5 shrink-0 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-card-hi transition-colors">›</button>
        <span className="text-meta text-ink-3 tnum">{rangeLabel}</span>
        {!isCurrent && (
          <button
            onClick={() => setAnchorMs(startOfDay(new Date()).getTime())}
            className="px-2 py-0.5 rounded-md border border-line text-meta text-ink-3 hover:text-ink transition-colors"
          >
            Today
          </button>
        )}
        <button
          onClick={logNow}
          className="ml-auto px-2 py-0.5 rounded-md border border-line text-meta text-ink-3 hover:text-ink transition-colors"
        >
          + Log time
        </button>
      </div>

      <div className="flex flex-col">
        <div className="grid text-meta text-ink-3 pb-1.5 border-b border-line"
          style={{ gridTemplateColumns: cols }}>
          <div />
          {days.map((d, i) => {
            const isToday = dateKey(d) === todayKeyStr;
            return (
              <div key={dateKey(d)} className="px-1 text-center">
                <div className={`tnum ${isToday ? 'text-ink font-medium' : ''}`}>
                  {days.length === 1 ? d.toLocaleDateString([], { weekday: 'short' }) : DOW[i]}
                </div>
                <div className={`tnum ${isToday
                  ? 'text-[var(--bg)] bg-accent rounded-full w-[18px] h-[18px] leading-[18px] mx-auto mt-0.5'
                  : 'mt-0.5'}`}>
                  {d.getDate()}
                </div>
                {/* The day's total, so the week reads as a bar chart of effort
                    as well as a calendar. */}
                <div className="mt-0.5 text-micro tnum text-ink-4">
                  {perDay[i] > 0 ? fmtDuration(perDay[i]) : '·'}
                </div>
                {wastePerDay[i] > 0 && (
                  <div className="text-micro tnum text-red" title="Wasted">
                    −{fmtDuration(wastePerDay[i])}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid relative" style={{ gridTemplateColumns: cols }}>
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: hourPx }}
                className="text-micro text-ink-4 pr-1.5 text-right tnum -translate-y-1">
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const isToday = dateKey(d) === todayKeyStr;
            return (
              <div key={dateKey(d)}
                onClick={e => onColumnClick(e, d)}
                title="Click to log time here"
                className={`relative border-l border-line/60 cursor-copy ${isToday ? 'bg-accent-soft/40' : ''}`}>
                {hours.map(h => (
                  <div key={h} style={{ height: hourPx }} className="border-b border-line/30">
                    {hourPx >= 38 && <div className="h-1/2 border-b border-line/15" />}
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
                    onOpen={openBlock}
                  />
                ))}

                {isToday && nowH >= startH && nowH <= endH && (
                  <div className="absolute inset-x-0 border-t border-accent pointer-events-none"
                    style={{ top: (nowH - startH) * hourPx, zIndex: 15 }}>
                    <span className="absolute -left-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="mt-4 text-center text-ui text-ink-4">
          No tracked time here. Hit ▶ on a task, or click the grid to log time by hand.
        </div>
      )}

      {editing && (
        <SessionModal
          // A new draft each time the grid is clicked, so the form resets.
          key={'id' in editing ? editing.id : editing.startedAt}
          session={editing}
          onClose={() => setEditing(null)}
          onOpenTask={openTask}
        />
      )}
    </Card>
  );
}
