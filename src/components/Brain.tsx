import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { supabase } from '../lib/supabase';
import { TAG_COLORS, PRIORITY_COLORS, fmtDue } from '../lib/dashboardHelpers';
import type { LifeArea, Task } from '../types';

// classify returns { ok, result }. For the plain-text advisor prompts the
// result is usually { text: "…" }, but tolerate a raw string too.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resultText(result: any): string {
  if (typeof result === 'string') return result;
  if (result && typeof result.text === 'string') return result.text;
  return JSON.stringify(result);
}

const LIFE_AREAS: LifeArea[] = [
  { id: 'academic',  name: 'Academic',       description: 'Coursework, research, and learning',        icon: '◈', color: '#93c5fd', taskTag: 'course'   },
  { id: 'career',    name: 'Career',         description: 'Internships, networking, and job search',   icon: '◉', color: '#c4b5fd', taskTag: 'career'   },
  { id: 'health',    name: 'Health',         description: 'Fitness, nutrition, and mental wellness',   icon: '◎', color: '#6ee7b7', taskTag: 'health'   },
  { id: 'personal',  name: 'Personal',       description: 'Projects, habits, and self-improvement',    icon: '◇', color: '#fcd34d', taskTag: 'personal' },
  { id: 'finance',   name: 'Finance',        description: 'Savings, budget, and net worth tracking',   icon: '◐', color: '#86efac', taskTag: undefined  },
  { id: 'content',   name: 'Content',        description: 'Writing, portfolio, and public work',       icon: '◫', color: '#f9a8d4', taskTag: undefined  },
  { id: 'social',    name: 'Relationships',  description: 'Friends, family, and community',            icon: '◑', color: '#fdba74', taskTag: undefined  },
];

function AreaCard({ area, selected, onClick }: { area: LifeArea; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${selected ? 'border-[var(--line-hi)] bg-[var(--bg-card)]' : 'border-[var(--line)] hover:border-[var(--line-hi)] bg-[var(--bg-elev)]/40'}`}
      style={{ borderLeftColor: selected ? area.color : undefined, borderLeftWidth: selected ? 2 : undefined }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[18px]" style={{ color: area.color }}>{area.icon}</span>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-[var(--t1)]">{area.name}</div>
          <div className="text-[10.5px] text-[var(--t3)] leading-tight truncate">{area.description}</div>
        </div>
      </div>
    </button>
  );
}

function TaskItem({ t }: { t: Task }) {
  const isDone = t.status === 'done';
  const tagColor = TAG_COLORS[t.tag] || {};
  return (
    <div className={`flex items-start gap-2 py-2 border-b border-[var(--line)]/50 last:border-b-0 ${isDone ? 'opacity-50' : ''}`}>
      <div className="mt-0.5 w-3 h-3 rounded-[3px] border border-[var(--t3)] shrink-0"
        style={isDone ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}} />
      <div className="min-w-0 flex-1">
        <div className={`text-[12px] ${isDone ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>{t.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
          <span style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
          <span className="px-1.5 py-0.5 rounded" style={{ color: tagColor.fg, background: tagColor.bg }}>{t.tag}</span>
          <span className="text-[var(--t4)]">{fmtDue(t.due)}</span>
        </div>
      </div>
    </div>
  );
}

function AreaPanel({ area }: { area: LifeArea }) {
  const { tasks } = useDashboard();
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const areaTasks = area.taskTag
    ? tasks.filter(t => t.tag === area.taskTag)
    : [];

  const askAI = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAiResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke('classify', {
        body: { type: 'area_summary', area: area.name, tasks: areaTasks, query },
      });
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error ?? 'Request failed');
      setAiResponse(resultText(data.result));
    } catch (e) {
      setAiResponse('⚠ ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-[24px]" style={{ color: area.color }}>{area.icon}</span>
        <div>
          <div className="text-[15px] font-semibold text-[var(--t1)]">{area.name}</div>
          <div className="text-[11.5px] text-[var(--t3)]">{area.description}</div>
        </div>
      </div>

      {areaTasks.length > 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-2">Tasks ({areaTasks.length})</div>
          {areaTasks.map(t => <TaskItem key={t.id} t={t} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--line)] border-dashed bg-[var(--bg-elev)]/20 p-4 text-center text-[11.5px] text-[var(--t4)]">
          No tasks in this area yet
        </div>
      )}

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/40 p-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-2">Notes</div>
        <textarea
          placeholder={`Freeform notes for ${area.name}…`}
          rows={4}
          className="w-full bg-transparent text-[12px] text-[var(--t2)] placeholder:text-[var(--t4)] outline-none resize-none leading-relaxed"
        />
        <div className="text-[9.5px] text-[var(--t4)] mt-1">Markdown supported · TODO: persist to Supabase</div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/40 p-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-2">AI Summary</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAI()}
            placeholder={`Ask about your ${area.name.toLowerCase()} situation…`}
            className="flex-1 bg-[var(--bg-card)] border border-[var(--line)] rounded-lg px-3 py-2 text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={askAI}
            disabled={loading || !query.trim()}
            className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[11.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>
        {aiResponse && (
          <div className={`mt-2.5 text-[12px] leading-relaxed rounded-lg p-3 ${aiResponse.startsWith('⚠') ? 'text-[var(--amber)] bg-[var(--amber)]/5 border border-[var(--amber)]/15' : 'text-[var(--t1)] bg-[var(--bg-card)]'}`}>
            {aiResponse}
          </div>
        )}
      </div>
    </div>
  );
}

function StrategicQuery() {
  const { tasks, goals, journal } = useDashboard();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke('classify', {
        body: { type: 'strategic_query', query, tasks, goals, recentJournal: journal.slice(0, 5) },
      });
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error ?? 'Request failed');
      setResponse(resultText(data.result));
    } catch (e) {
      setResponse('⚠ ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1l1.57 3.18L12 4.64l-2.5 2.44.59 3.44L7 8.77 3.91 10.52l.59-3.44L2 4.64l3.43-.46L7 1z" fill="var(--accent)" />
        </svg>
        <div className="text-[12px] font-medium text-[var(--t1)]">Strategic Query</div>
        <span className="text-[10px] text-[var(--t4)] bg-[var(--bg-elev)] px-1.5 py-0.5 rounded">Claude</span>
      </div>
      <p className="text-[11px] text-[var(--t3)] mb-3">Ask across all your tasks, journal, and goals for strategic insight.</p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="What should I focus on this week?"
          className="flex-1 bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg px-3 py-2.5 text-[12.5px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          onClick={ask}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
        >
          {loading ? '…' : 'Ask Claude'}
        </button>
      </div>
      {response && (
        <div className={`mt-3 text-[12.5px] leading-relaxed rounded-lg p-3 ${response.startsWith('⚠') ? 'text-[var(--amber)] bg-[var(--amber)]/5 border border-[var(--amber)]/15' : 'text-[var(--t1)] bg-[var(--bg-elev)]'}`}>
          {response}
        </div>
      )}
    </div>
  );
}

export function Brain() {
  const [selected, setSelected] = useState<LifeArea | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <StrategicQuery />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] pb-1">Life areas</div>
          {LIFE_AREAS.map(area => (
            <AreaCard
              key={area.id}
              area={area}
              selected={selected?.id === area.id}
              onClick={() => setSelected(a => a?.id === area.id ? null : area)}
            />
          ))}
        </div>

        <div>
          {selected ? (
            <AreaPanel area={selected} />
          ) : (
            <div className="h-48 flex items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-[12px] text-[var(--t4)]">
              Select a life area to explore tasks, notes, and AI insights
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
