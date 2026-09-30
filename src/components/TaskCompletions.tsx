import { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';
import {
  SCALES, buildDistribution, parseDateKey, useTodayKey,
} from '../lib/taskStats';
import type { DistributionBucket, DistributionScale } from '../lib/taskStats';

// One series — tasks finished — so one colour, the same green the rest of the
// app already means "done" with. No legend: the card's title names the series.
const SERIES = 'var(--green)';

const PLOT_H = 128;
/** A bar never fills its slot; the leftover is deliberate air. */
const BAR_MAX_W = 24;
/** A day with nothing on it still gets a mark, so the gap reads as zero. */
const ZERO_STUB_H = 2;

/**
 * A round number at or above `v`, for the top gridline. Small counts (a normal
 * day) keep their own scale rather than being squashed against a 10.
 */
function niceMax(v: number): number {
  // Up to ten tasks the peak *is* a round number, and rounding it up to 10
  // would leave a good day looking like a half-empty bar.
  if (v <= 10) return Math.max(1, v);
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
    if (v <= m * mag) return m * mag;
  }
  return 10 * mag;
}

/** Keeps the tooltip inside the plot when the hovered bar is near an edge. */
function tipAnchor(i: number, n: number) {
  if (i <= n * 0.15) return 'left-0';
  if (i >= n * 0.85) return 'right-0';
  return 'left-1/2 -translate-x-1/2';
}

interface BarProps {
  bucket: DistributionBucket;
  index: number;
  /** How many bars there are, so the tooltip knows when it's near an edge. */
  total: number;
  count: number;
  max: number;
  hovered: boolean;
  grain: 'day' | 'week';
  onHover: (i: number | null) => void;
}

function Bar({ bucket, index, total, count, max, hovered, grain, onHover }: BarProps) {
  const h = count === 0 ? ZERO_STUB_H : Math.max(3, Math.round((count / max) * PLOT_H));
  const readout = `${bucket.label} · ${count} ${count === 1 ? 'task' : 'tasks'}`;

  return (
    <div
      // The whole column is the hit target, not the bar — in the 52-week view a
      // bar is a few pixels wide and a short one would be near-impossible to hit.
      className="relative flex-1 h-full flex items-end justify-center rounded-t-[4px]"
      style={{ background: hovered ? 'var(--accent-2)' : 'transparent' }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onPointerDown={() => onHover(index)}
      title={readout}
      aria-label={readout}
    >
      <div
        className="w-full rounded-t-[4px]"
        style={{
          height: h,
          maxWidth: BAR_MAX_W,
          background: count === 0 ? 'var(--line-hi)' : SERIES,
        }}
      />
      {hovered && (
        <div
          className={`absolute top-0 z-10 px-2 py-1 rounded-md pointer-events-none whitespace-nowrap
            border border-[var(--line-hi)] bg-[var(--bg-card-hi)] shadow-lg ${tipAnchor(index, total)}`}
        >
          <div className="text-[10.5px] text-[var(--t2)]">{bucket.label}</div>
          <div className="text-[12px] text-[var(--t1)] tnum">
            {count} {count === 1 ? 'task' : 'tasks'}
            <span className="text-[var(--t3)]"> / {grain}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskCompletions() {
  const { doneByDay } = useDashboard();
  const [scale, setScale] = useState<DistributionScale>('Week');
  const [hover, setHover] = useState<number | null>(null);
  // Anchoring the window to today's date key (not `new Date()`) means the
  // chart rolls over on its own at midnight instead of on the next reload.
  const today = useTodayKey();

  const dist = useMemo(
    () => buildDistribution(doneByDay, scale, parseDateKey(today)),
    [doneByDay, scale, today],
  );

  const peak = dist.buckets.reduce((m, b) => Math.max(m, b.count), 0);
  const max = niceMax(peak);
  const n = dist.buckets.length;

  return (
    <Card
      title="Tasks completed"
      kicker={dist.rangeLabel}
      action={<Tabs tabs={[...SCALES]} value={scale} onChange={t => setScale(t as DistributionScale)} />}
    >
      <div className="flex gap-2" onMouseLeave={() => setHover(null)}>
        {/* Y axis: just the top of the scale and the baseline — the tooltip
            carries every other value, so more ticks would only add ink. */}
        <div
          className="w-6 shrink-0 flex flex-col justify-between text-right text-[9.5px] text-[var(--t4)] tnum"
          style={{ height: PLOT_H }}
        >
          <span>{max}</span>
          <span>0</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: PLOT_H }}>
            {/* Hairline grid, one step off the surface, behind the bars. */}
            <div className="absolute inset-x-0 top-0 h-px bg-[var(--line)]" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--line-hi)]" />
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {dist.buckets.map((b, i) => (
                <Bar
                  key={b.key}
                  bucket={b}
                  index={i}
                  total={n}
                  count={b.count}
                  max={max}
                  grain={dist.grain}
                  hovered={hover === i}
                  onHover={setHover}
                />
              ))}
            </div>
          </div>

          {/* Ticks sit *over* their slot rather than inside it: a slot is only a
              few pixels wide in the longer views, and a label boxed into one
              would be clipped to its first character. Each one stays centred on
              its bar and is allowed to overhang — the neighbouring slots are
              blank by construction, and the card's own padding catches the ends. */}
          <div className="relative mt-1.5 h-3 flex gap-[2px]">
            {dist.buckets.map(b => (
              <div key={b.key} className="relative flex-1 min-w-0">
                {b.tick && (
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9.5px] tnum ${
                      b.isCurrent ? 'text-[var(--t2)]' : 'text-[var(--t4)]'
                    }`}
                  >
                    {b.tick}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center gap-4 text-[11px] text-[var(--t3)]">
        <span>
          <span className="text-[var(--t1)] tnum">{dist.total}</span> done
        </span>
        <span>
          <span className="text-[var(--t2)] tnum">{dist.average}</span> / {dist.grain}
        </span>
        {dist.best && (
          <span className="truncate">
            best <span className="text-[var(--t2)] tnum">{dist.best.count}</span>
            <span className="text-[var(--t4)]"> · {dist.best.label.replace(/^(Today|This week) · /, '')}</span>
          </span>
        )}
        {dist.total === 0 && (
          <span className="text-[var(--t4)]">check a task off and it lands here</span>
        )}
      </div>
      <div className="sr-only">{n} bars, one per {dist.grain}, over the {dist.rangeLabel}.</div>
    </Card>
  );
}
