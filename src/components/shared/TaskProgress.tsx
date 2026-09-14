import { useClock, fmtSpan, taskElapsedMs } from '../../lib/dashboardHelpers';
import type { Task } from '../../types';

/**
 * Start/stop a task's stopwatch. Unlike the other row controls this stays
 * visible once a task is running — a ticking clock you can't see is a clock you
 * forget to stop.
 */
export function ProgressBtn({ running, onToggle }: { running: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      title={running ? 'Pause — keeps the time tracked so far' : 'Mark in progress'}
      className={`transition-opacity shrink-0 hover:scale-110 ${
        running ? 'text-[var(--green)]' : 'opacity-0 group-hover:opacity-100 text-[var(--t3)] hover:text-[var(--t1)]'
      }`}
    >
      {running ? (
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <rect x="2.5" y="2.5" width="2.5" height="7" rx="0.8" fill="currentColor" />
          <rect x="7" y="2.5" width="2.5" height="7" rx="0.8" fill="currentColor" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3.6 2.4l5.4 3.6-5.4 3.6V2.4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/**
 * Total time tracked on a task, "12m 30s". Green and ticking while it runs,
 * muted once paused. Isolated so only this node repaints each second.
 */
export function Elapsed({ task }: { task: Pick<Task, 'startedAt' | 'timeSpentMs'> }) {
  const now = useClock();
  const running = !!task.startedAt;
  return (
    <span
      className="text-[10px] tnum shrink-0"
      style={{ color: running ? 'var(--green)' : 'var(--t3)' }}
      title={running ? 'Time tracked — running' : 'Time tracked — paused'}
    >
      {fmtSpan(taskElapsedMs(task, now.getTime()))}
    </span>
  );
}
