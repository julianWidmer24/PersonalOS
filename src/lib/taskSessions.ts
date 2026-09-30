import type { Project, TaskSession, TaskTag } from '../types';
import type { TimeSpan } from './calendarLayout';
import { TAG_COLORS } from './dashboardHelpers';
import { colorFromHex } from './eventColors';
import type { KindColor } from './eventColors';
import { dateKey, startOfDay } from './taskStats';

// Turning stopwatch stints into calendar blocks.
//
// A session is a wall-clock interval. A calendar column is one local day. The
// two don't line up: a stint from 11pm to 1am is one session and two blocks,
// so the work is split per day here rather than clipped or dropped.

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * A session, or the part of one that falls inside a single day. `start`/`end`
 * are fractional hours from that day's midnight, which is what the layout
 * packer and the grid both speak.
 */
export interface SessionBlock extends TimeSpan {
  /** Unique per block — a split session yields two, so this isn't the session id. */
  id: string;
  sessionId: string;
  taskId: string | null;
  title: string;
  tag: TaskTag;
  projectId: string | null;
  /** Index into the `days` array this block was laid out against. */
  dayIndex: number;
  /** Local date key of the day this segment sits on. */
  date: string;
  /** True while the stopwatch is still running. */
  running: boolean;
  /** This segment picks up from the previous day (the stint crossed midnight). */
  continuedFrom: boolean;
  /** This segment runs on into the next day. */
  continuesInto: boolean;
  /** The whole stint, for the tooltip — not just the part on this day. */
  spanStart: Date;
  spanEnd: Date;
}

/**
 * A block shorter than this still gets drawn at this length, so a stint you
 * started and stopped by accident stays clickable instead of collapsing to a
 * hairline. Small enough not to misstate a real span.
 */
const MIN_SPAN_HOURS = 1 / 60;

/**
 * Cut every session down to the parts that fall on `days`, in fractional
 * hours. `days` are local midnights; a running session is measured up to
 * `now`, so its block grows as the clock does.
 */
export function sessionBlocks(
  sessions: TaskSession[],
  days: Date[],
  now: number = Date.now(),
): SessionBlock[] {
  const out: SessionBlock[] = [];
  if (!days.length) return out;

  const bounds = days.map(d => {
    const t = startOfDay(d).getTime();
    return { t, end: t + MS_PER_DAY, key: dateKey(d) };
  });
  const windowStart = bounds[0].t;
  const windowEnd = bounds[bounds.length - 1].end;

  for (const s of sessions) {
    const from = Date.parse(s.startedAt);
    if (Number.isNaN(from)) continue;
    const running = s.endedAt == null;
    // A running stint reads to the current moment. Clamp to `from` so a device
    // whose clock trails the one that started it never renders a negative span.
    const to = running ? Math.max(from, now) : Date.parse(s.endedAt!);
    if (Number.isNaN(to) || to < windowStart || from > windowEnd) continue;

    for (let i = 0; i < bounds.length; i++) {
      const { t: dayStart, end: dayEnd, key } = bounds[i];
      const lo = Math.max(from, dayStart);
      const hi = Math.min(to, dayEnd);
      // Strictly-less keeps a stint that ends exactly at midnight off the next
      // day, where it would draw a zero-height sliver at the top of the column.
      if (hi <= lo && !(from === to && from >= dayStart && from < dayEnd)) continue;

      const start = (lo - dayStart) / MS_PER_HOUR;
      const end = Math.min(24, Math.max((hi - dayStart) / MS_PER_HOUR, start + MIN_SPAN_HOURS));
      out.push({
        id: `${s.id}:${key}`,
        sessionId: s.id,
        taskId: s.taskId,
        title: s.title || 'Untitled task',
        tag: s.tag,
        projectId: s.projectId,
        dayIndex: i,
        date: key,
        start,
        end,
        running,
        continuedFrom: from < dayStart,
        continuesInto: to > dayEnd,
        spanStart: new Date(from),
        spanEnd: new Date(to),
      });
    }
  }
  return out;
}

/**
 * A block's colour: the project's swatch when the task belongs to one, else
 * the hue its tag is drawn in everywhere else in the app. A project whose row
 * has been deleted falls back to the tag rather than losing its colour.
 */
export function colorForSession(
  block: Pick<SessionBlock, 'projectId' | 'tag'>,
  projects: Project[],
): KindColor {
  const project = block.projectId ? projects.find(p => p.id === block.projectId) : undefined;
  return colorFromHex(project?.color ?? TAG_COLORS[block.tag]?.fg ?? TAG_COLORS.personal.fg);
}

/** Hours tracked across a set of blocks. */
export const totalHours = (blocks: SessionBlock[]) =>
  blocks.reduce((sum, b) => sum + (b.end - b.start), 0);

/** Hours tracked per day index, for the column headers. */
export function hoursByDay(blocks: SessionBlock[], dayCount: number): number[] {
  const out = new Array(dayCount).fill(0);
  for (const b of blocks) out[b.dayIndex] += b.end - b.start;
  return out;
}

/** Monday 00:00 of the week `d` falls in, then the seven days from it. */
export function weekFrom(d: Date): Date[] {
  const mon = startOfDay(d);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day;
  });
}
