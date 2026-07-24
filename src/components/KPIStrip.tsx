import { useDashboard } from '../context/DashboardContext';
import { useWorkoutToday } from '../hooks/usePhysical';

interface KPIProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}

function KPI({ label, value, hint, accent }: KPIProps) {
  return (
    <div className="flex-1 px-5 py-4 border-r border-[var(--line)] last:border-r-0">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-medium tracking-[-0.02em] tnum" style={{ color: accent || 'var(--t1)' }}>
          {value}
        </span>
      </div>
      {hint && <div className="mt-1 text-[11px] text-[var(--t3)]">{hint}</div>}
    </div>
  );
}

function WorkoutKPI({ w }: { w: ReturnType<typeof useWorkoutToday> }) {
  return (
    <div className="flex-1 px-5 py-4 border-r border-[var(--line)] last:border-r-0">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">Workout</div>
        {w.doneToday && <span className="text-[9.5px] tnum" style={{ color: '#6ee7b7' }}>✓ done</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[20px] leading-none" style={{ color: w.kind.fg }}>{w.kind.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.01em] text-[var(--t1)] truncate leading-tight">
            {w.workout?.name || 'Rest'}
          </div>
          <div className="text-[10.5px] text-[var(--t3)] tnum">
            day {w.idx + 1}/{w.total} · {w.streak}-day streak
          </div>
        </div>
      </div>
    </div>
  );
}

export function KPIStrip() {
  const { tasks, habits } = useDashboard();
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const habitDone = habits.filter(h => h.done).length;
  const workout = useWorkoutToday();

  return (
    <div className="flex rounded-xl border border-[var(--line)] bg-[var(--bg-card)] overflow-hidden">
      <KPI label="Open tasks" value={openTasks}
        hint={`${tasks.filter(t => t.priority === 'P0' && t.status !== 'done').length} P0 today`} />
      <KPI label="Habits" value={habits.length > 0 ? `${habitDone}/${habits.length}` : '—'} hint="today" />
      <WorkoutKPI w={workout} />
      <KPI label="Sleep" value="—" hint="connect wearable" />
      <KPI label="Net worth" value="—" hint="connect Sheets" />
    </div>
  );
}

export function KPIStripResponsive() {
  return (
    <div className="-mx-1 sm:mx-0 overflow-x-auto pos-scroll">
      <div className="min-w-[640px] sm:min-w-0 px-1 sm:px-0">
        <KPIStrip />
      </div>
    </div>
  );
}
