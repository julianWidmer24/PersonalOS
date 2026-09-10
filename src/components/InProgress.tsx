import { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useClock, fmtSpan, fmtDue, TAG_COLORS, PRIORITY_COLORS } from '../lib/dashboardHelpers';
import type { Task, Project } from '../types';
import { Card } from './shared/Card';
import { Chip } from './shared/Chip';

/** The ticking dot that marks a task as running right now. */
function LiveDot({ size = 6 }: { size?: number }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-70 animate-ping"
        style={{ background: 'var(--green)' }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, background: 'var(--green)' }}
      />
    </span>
  );
}

function StopBtn({ onStop, label }: { onStop: () => void; label: string }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onStop(); }}
      title={label}
      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--line)] text-[10.5px] text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <rect x="0.5" y="0.5" width="7" height="7" rx="1.5" fill="currentColor" />
      </svg>
      Stop
    </button>
  );
}

export function InProgress() {
  const now = useClock();
  const { tasks, projects, toggleTaskProgress, toggleTask, setModal } = useDashboard();

  const projById = useMemo(
    () => Object.fromEntries((projects || []).map(p => [p.id, p] as const)),
    [projects],
  );

  // Most recently started first — the thing you just picked up leads the card.
  // A done task can't be in progress, but guard anyway so a stale `startedAt`
  // (an older row, or another device mid-sync) never keeps a clock running.
  const running = useMemo(
    () => tasks
      .filter((t): t is Task & { startedAt: string } => !!t.startedAt && t.status !== 'done')
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    [tasks],
  );

  if (running.length === 0) return null;

  const [lead, ...rest] = running;
  const leadProject: Project | null = lead.projectId ? projById[lead.projectId] ?? null : null;
  const leadTag = TAG_COLORS[lead.tag] || {};
  const elapsed = (t: { startedAt: string }) => now.getTime() - Date.parse(t.startedAt);

  return (
    <Card title="In progress" kicker={running.length > 1 ? `${running.length} running` : undefined}>
      <div className="flex items-center gap-2">
        <LiveDot />
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--t4)]">elapsed</span>
      </div>
      <div
        className="mt-0.5 text-[30px] leading-none tnum font-medium tabular-nums"
        style={{ color: 'var(--green)' }}
      >
        {fmtSpan(elapsed(lead))}
      </div>

      <div
        onClick={() => setModal({ kind: 'task', taskId: lead.id })}
        title="Edit task"
        className="mt-2.5 text-[13px] leading-tight text-[var(--t1)] hover:text-[var(--accent)] cursor-text break-words transition-colors"
      >
        {lead.title}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] tnum font-mono" style={{ color: PRIORITY_COLORS[lead.priority] }}>
          {lead.priority}
        </span>
        <Chip fg={leadTag.fg} bg={leadTag.bg}>{lead.tag}</Chip>
        {leadProject && (
          <span
            className="px-1.5 py-0.5 rounded text-[9.5px] font-medium"
            style={{ color: leadProject.color, background: `${leadProject.color}15` }}
          >
            {leadProject.title}
          </span>
        )}
        <span className="text-[10.5px] text-[var(--t3)] truncate">{fmtDue(lead.due)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={() => toggleTask(lead.id)}
          title="Mark done"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
            <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Done
        </button>
        <StopBtn onStop={() => toggleTaskProgress(lead.id)} label="Stop the stopwatch" />
      </div>

      {rest.length > 0 && (
        <ul className="mt-3 pt-2.5 border-t border-[var(--line)]/60 space-y-2">
          {rest.map(t => (
            <li key={t.id} className="group flex items-center gap-2">
              <LiveDot size={5} />
              <span
                onClick={() => setModal({ kind: 'task', taskId: t.id })}
                title="Edit task"
                className="text-[11.5px] text-[var(--t2)] hover:text-[var(--t1)] truncate flex-1 cursor-text transition-colors"
              >
                {t.title}
              </span>
              <span className="text-[10.5px] tnum shrink-0" style={{ color: 'var(--green)' }}>
                {fmtSpan(elapsed(t))}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <StopBtn onStop={() => toggleTaskProgress(t.id)} label={`Stop ${t.title}`} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
