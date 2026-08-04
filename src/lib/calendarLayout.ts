import type { CalendarEvent } from '../types';

const EPS = 1e-6;

export interface PositionedEvent {
  event: CalendarEvent;
  /** 0..1 fraction of the day column */
  left: number;
  /** 0..1 fraction of the day column */
  width: number;
  /** how many events share this event's overlap cluster (1 = no conflict) */
  clusterSize: number;
  /** paint order — later columns sit on top so their left edge stays visible */
  z: number;
}

function overlaps(a: CalendarEvent, b: CalendarEvent) {
  return a.start < b.end - EPS && b.start < a.end - EPS;
}

// Google-Calendar-style packing: events that overlap in time are split into
// side-by-side columns, then each one expands rightwards into any column that
// stays free for its whole duration. Non-overlapping events keep full width.
function packCluster(cluster: CalendarEvent[]): PositionedEvent[] {
  const colEnds: number[] = [];
  const colOf: number[] = [];

  cluster.forEach((e, i) => {
    let c = colEnds.findIndex(end => end <= e.start + EPS);
    if (c === -1) {
      c = colEnds.length;
      colEnds.push(e.end);
    } else {
      colEnds[c] = e.end;
    }
    colOf[i] = c;
  });

  const colCount = colEnds.length;

  return cluster.map((e, i) => {
    const col = colOf[i];
    let span = 1;
    while (
      col + span < colCount &&
      !cluster.some((o, j) => j !== i && colOf[j] === col + span && overlaps(o, e))
    ) {
      span++;
    }
    return {
      event: e,
      left: col / colCount,
      width: span / colCount,
      clusterSize: colCount,
      z: col,
    };
  });
}

/** Positions one day's events, resolving overlaps into columns. */
export function layoutDay(events: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...events]
    .map(e => (e.end > e.start ? e : { ...e, end: e.start + 0.25 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: PositionedEvent[] = [];
  let cluster: CalendarEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length) out.push(...packCluster(cluster));
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const e of sorted) {
    if (cluster.length && e.start >= clusterEnd - EPS) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  flush();
  return out;
}

/** Visible hour window: fits the events on screen instead of clipping them. */
export function hourWindow(events: CalendarEvent[], fallback: [number, number] = [8, 21]) {
  if (!events.length) return fallback;
  const min = Math.min(...events.map(e => e.start));
  const max = Math.max(...events.map(e => e.end));
  const startH = Math.max(0, Math.min(Math.floor(min), fallback[0]));
  const endH = Math.min(24, Math.max(Math.ceil(max), fallback[1]));
  return [startH, endH] as [number, number];
}

export function fmtHour(h: number, opts: { pad?: boolean } = {}) {
  const total = Math.round(h * 60);
  let hr = Math.floor(total / 60) % 24;
  const min = total % 60;
  const suffix = hr >= 12 ? 'p' : 'a';
  hr = hr % 12 === 0 ? 12 : hr % 12;
  const mm = min === 0 && !opts.pad ? '' : `:${String(min).padStart(2, '0')}`;
  return `${hr}${mm}${suffix}`;
}

export function fmtRange(start: number, end: number) {
  return `${fmtHour(start)} – ${fmtHour(end)}`;
}

export function fmtDuration(hours: number) {
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
