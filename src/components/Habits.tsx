import { useDashboard } from '../context/DashboardContext';
import { Card } from './shared/Card';

function HabitDots({ hist }: { hist: string }) {
  return (
    <div className="flex items-center gap-[3px]">
      {hist.split('').map((c, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-[1.5px]"
          style={{ background: c === '1' ? 'var(--t2)' : 'var(--line-hi)' }}
        />
      ))}
    </div>
  );
}

interface HabitsProps {
  variant?: 'sm' | 'md' | 'lg';
}

export function Habits({ variant = 'md' }: HabitsProps) {
  const { habits, toggleHabit } = useDashboard();
  const done = habits.filter(h => h.done).length;
  const compact = variant === 'sm';

  return (
    <Card
      title="Daily habits"
      kicker={`${done}/${habits.length} today`}
      dense={compact}
      action={
        <span className="text-[11px] text-[var(--t3)] tnum">
          <span className="text-[var(--amber)]">●</span> 22-day streak
        </span>
      }
    >
      <ul className="space-y-1">
        {habits.map(h => (
          <li key={h.id} className="flex items-center gap-3 py-1.5 group">
            <button
              onClick={() => toggleHabit(h.id)}
              className="w-5 h-5 rounded-full border grid place-items-center shrink-0 transition-all"
              style={h.done
                ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                : { borderColor: 'var(--line-hi)' }}
            >
              {h.done && (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2 5L4 7L8 3" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-[12.5px] ${h.done ? 'text-[var(--t2)]' : 'text-[var(--t1)]'} truncate`}>
                {h.name}
              </div>
            </div>
            {!compact && <HabitDots hist={h.hist} />}
            <span className="text-[10.5px] tnum text-[var(--t3)] w-10 text-right">{h.streak}d</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
