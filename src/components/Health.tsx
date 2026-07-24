import { useState } from 'react';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';

export function Health() {
  const [tab, setTab] = useState('Today');

  return (
    <Card
      title="Health & nutrition"
      kicker="no data yet"
      action={<Tabs tabs={['Today', 'Week']} value={tab} onChange={setTab} />}
    >
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--t4)]">
          <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 16h3l2-4 2 8 2-4h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="text-[12.5px] text-[var(--t2)] font-medium">No health data</div>
          <div className="mt-1 text-[11px] text-[var(--t4)] max-w-[200px]">
            Connect a wearable or log meals to start tracking sleep, steps, and nutrition.
          </div>
        </div>
      </div>
    </Card>
  );
}
