import { useState } from 'react';
import { Calendar } from '../components/Calendar';
import { TimeCalendar } from '../components/TimeCalendar';
import { Tabs } from '../components/shared/Tabs';

/**
 * Two calendars over the same days: what was *planned* (Google events, classes,
 * workouts) and what actually *happened* (stopwatch stints). They're separate
 * views rather than one merged grid — overlaying intent on outcome makes both
 * harder to read, and the tracked side has its own week navigation.
 */
export function CalendarPage() {
  const [view, setView] = useState('Schedule');

  return (
    <main className="max-w-[1700px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--t3)]">
          Calendar
        </h1>
        <Tabs tabs={['Schedule', 'Time tracked']} value={view} onChange={setView} size="md" />
      </div>

      {view === 'Schedule' ? <Calendar page /> : <TimeCalendar page />}
    </main>
  );
}
