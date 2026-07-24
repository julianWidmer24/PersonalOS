import { useState } from 'react';
import { useDashboard, fmt } from '../context/DashboardContext';
import type { Goal } from '../types';
import { Card } from './shared/Card';
import { IconBtn } from './shared/IconBtn';

const TIMEFRAME_LABELS: Record<string, string> = {
  week: 'This Week',
  month: 'This Month',
  semester: 'This Semester',
  year: 'This Year',
};

const TIMEFRAME_ORDER = ['week', 'month', 'semester', 'year'] as const;

const KIND_COLORS: Record<string, string> = {
  academic: 'var(--blue)',
  career:   'var(--purple)',
  health:   'var(--green)',
  personal: 'var(--amber)',
  finance:  'var(--accent)',
};

function GoalRow({ g }: { g: Goal }) {
  const { toggleGoal, removeGoal } = useDashboard();
  const accent = KIND_COLORS[g.kind] || 'var(--accent)';

  return (
    <div className={`py-2.5 border-b border-[var(--line)]/60 last:border-b-0 group ${g.isComplete ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => toggleGoal(g.id)}
          title={g.isComplete ? 'Mark active' : 'Mark complete'}
          className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center transition-colors shrink-0"
          style={g.isComplete ? { background: 'var(--green)', borderColor: 'var(--green)' } : {}}
        >
          {g.isComplete && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className={`text-[12.5px] leading-tight ${g.isComplete ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>{g.title}</div>
              <div className="mt-0.5 text-[10.5px] text-[var(--t3)] tnum">{g.metric} · by {g.target}</div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <span className="text-[11px] tnum text-[var(--t2)]">{fmt.pct(g.progress)}</span>
              <IconBtn title="Remove goal" onClick={() => removeGoal(g.id)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </IconBtn>
            </div>
          </div>
          {!g.isComplete && (
            <div className="mt-2 h-1 rounded-full bg-[var(--line)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${g.progress * 100}%`, background: accent }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddGoalForm({ onAdd, onClose }: { onAdd: (data: Partial<Goal>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState<Goal['timeframe']>('month');
  const [metric, setMetric] = useState('');
  const [target, setTarget] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), timeframe, metric: metric || '—', target: target || '—', kind: 'personal', progress: 0 });
    onClose();
  };

  return (
    <form onSubmit={submit} className="mt-3 border border-[var(--line)] rounded-lg p-3 bg-[var(--bg-elev)] flex flex-col gap-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Goal title…"
        className="w-full bg-transparent text-[12.5px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
      />
      <div className="flex gap-2">
        <select
          value={timeframe}
          onChange={e => setTimeframe(e.target.value as Goal['timeframe'])}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--line)] rounded text-[11px] text-[var(--t2)] px-2 py-1 outline-none"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="semester">This Semester</option>
          <option value="year">This Year</option>
        </select>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="Target date"
          className="flex-1 bg-[var(--bg-card)] border border-[var(--line)] rounded text-[11px] text-[var(--t2)] px-2 py-1 outline-none placeholder:text-[var(--t4)]"
        />
      </div>
      <input
        value={metric}
        onChange={e => setMetric(e.target.value)}
        placeholder="Success metric (e.g. 3.9 GPA)"
        className="w-full bg-transparent text-[11px] text-[var(--t2)] placeholder:text-[var(--t4)] outline-none border-t border-[var(--line)] pt-2"
      />
      <div className="flex gap-1.5 justify-end">
        <button type="button" onClick={onClose} className="px-2.5 py-1 text-[11px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors">Cancel</button>
        <button type="submit" className="px-2.5 py-1 text-[11px] bg-[var(--accent)] text-[var(--bg)] rounded-md font-medium">Add</button>
      </div>
    </form>
  );
}

export function Goals() {
  const { goals, addGoal } = useDashboard();
  const [adding, setAdding] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const active = goals.filter(g => !g.isComplete);
  const archived = goals.filter(g => g.isComplete);

  const grouped = TIMEFRAME_ORDER.reduce<Record<string, Goal[]>>((acc, tf) => {
    const items = active.filter(g => g.timeframe === tf);
    if (items.length) acc[tf] = items;
    return acc;
  }, {});

  return (
    <Card
      title="Goals"
      kicker={`${active.length} active`}
      action={
        <IconBtn title="New goal" onClick={() => setAdding(a => !a)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </IconBtn>
      }
    >
      <div>
        {adding && (
          <AddGoalForm onAdd={d => { addGoal(d); }} onClose={() => setAdding(false)} />
        )}

        {Object.entries(grouped).map(([tf, gs]) => (
          <div key={tf} className="mb-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t4)] pt-3 pb-1 first:pt-1">{TIMEFRAME_LABELS[tf]}</div>
            {gs.map(g => <GoalRow key={g.id} g={g} />)}
          </div>
        ))}

        {active.length === 0 && !adding && (
          <div className="py-4 text-center text-[11.5px] text-[var(--t4)]">No active goals — add one above</div>
        )}

        {archived.length > 0 && (
          <div className="mt-3 border-t border-[var(--line)]/60 pt-2">
            <button
              onClick={() => setShowArchive(s => !s)}
              className="text-[10.5px] text-[var(--t4)] hover:text-[var(--t2)] transition-colors flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${showArchive ? 'rotate-90' : ''}`}>
                <path d="M3.5 2L7 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {archived.length} completed
            </button>
            {showArchive && archived.map(g => <GoalRow key={g.id} g={g} />)}
          </div>
        )}
      </div>
    </Card>
  );
}
