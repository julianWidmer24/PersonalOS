import { useDashboard } from '../context/DashboardContext';
import { PRIORITY_COLORS } from '../lib/dashboardHelpers';
import { Card } from './shared/Card';

export function KeyTasks() {
  const { tasks, toggleTask, starTask } = useDashboard();
  const starred = tasks.filter(t => t.isStarred && t.status !== 'done');

  if (starred.length === 0) return null;

  return (
    <Card title="Key tasks" kicker={`${starred.length} starred`}>
      <ul className="space-y-0">
        {starred.map(t => (
          <li key={t.id} className="group flex items-start gap-2.5 py-2 border-b border-[var(--line)]/60 last:border-b-0">
            <button
              onClick={() => toggleTask(t.id)}
              className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center transition-colors shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-[var(--t1)] leading-tight">{t.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[10px] tnum font-mono" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                <span className="text-[10.5px] text-[var(--t3)]">{t.due}</span>
              </div>
            </div>
            <button
              onClick={() => starTask(t.id)}
              title="Unstar"
              className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1l1.35 2.73 3.02.44-2.19 2.13.52 3.01L6 7.77l-2.7 1.54.52-3.01L1.63 4.17l3.02-.44L6 1z"
                  fill="var(--amber)" stroke="var(--amber)" strokeWidth="1.1" strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
