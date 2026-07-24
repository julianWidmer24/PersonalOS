import { useState } from 'react';
import { Card } from './shared/Card';

export function Finance() {
  const [revealed, setRevealed] = useState(false);

  const RevealBtn = (
    <button
      onClick={() => setRevealed(r => !r)}
      className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--line)] text-[10.5px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors"
    >
      {revealed ? (
        <>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            <path d="M2 2l8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Hide
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
          </svg>
          Reveal
        </>
      )}
    </button>
  );

  return (
    <Card title="Finance pulse" kicker="no data yet" action={RevealBtn}>
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--t4)]">
          <rect x="4" y="10" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 15h24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 20h4M18 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <div className="text-[12.5px] text-[var(--t2)] font-medium">No finance data</div>
          <div className="mt-1 text-[11px] text-[var(--t4)] max-w-[220px]">
            Connect your Google Sheet to pull net worth, spending, and transactions automatically.
          </div>
        </div>
        <div className="mt-2 text-[10.5px] text-[var(--t4)] bg-[var(--bg-elev)] px-3 py-1.5 rounded-lg border border-[var(--line)]">
          Settings → Integrations → Google Sheets
        </div>
      </div>
    </Card>
  );
}
