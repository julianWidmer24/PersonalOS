import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { SEED_DATA } from '../data/seed';
import { Card } from './shared/Card';
import { IconBtn } from './shared/IconBtn';

const MOOD_COLOR: Record<string, string> = {
  focused:  '#93c5fd',
  tired:    '#f5c451',
  grateful: '#6ee7b7',
  restless: '#f87171',
};

export function Journal() {
  const { journal, addJournal, setModal } = useDashboard();
  const prompt = SEED_DATA.journalPrompts[new Date().getDate() % SEED_DATA.journalPrompts.length];
  const [draft, setDraft] = useState('');

  return (
    <Card
      title="Journal"
      kicker={`${journal.length} entries`}
      action={
        <IconBtn title="New entry" onClick={() => setModal({ kind: 'journal', prompt })}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </IconBtn>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="p-3 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1.5">Today's prompt</div>
          <p className="text-[13px] font-serif italic leading-snug text-[var(--t1)]">{prompt}</p>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Start writing..."
            rows={2}
            className="mt-2 w-full bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none resize-none"
          />
          {draft.length > 0 && (
            <button
              onClick={() => { addJournal(draft); setDraft(''); }}
              className="mt-1 text-[11px] text-[var(--accent)] hover:underline"
            >
              Save entry →
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {journal.slice(0, 5).map(j => (
            <li key={j.id} className="flex gap-2.5">
              <span className="w-1 self-stretch rounded-full" style={{ background: MOOD_COLOR[j.mood] || 'var(--t3)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10.5px] tnum text-[var(--t3)]">{j.date}</span>
                  <span className="text-[10px] text-[var(--t4)] uppercase tracking-wider">{j.mood}</span>
                </div>
                <p className="text-[12px] text-[var(--t2)] leading-snug mt-0.5">{j.excerpt}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
