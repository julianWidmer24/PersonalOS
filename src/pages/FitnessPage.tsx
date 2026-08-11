import { useState } from 'react';
import { MealLog } from '../components/MealLog';
import { MealPlan } from '../components/MealPlan';
import { PhysicalActivity } from '../components/PhysicalActivity';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { Tabs } from '../components/shared/Tabs';

export function FitnessPage() {
  const [tab, setTab] = useState('Training');

  return (
    <main className="max-w-[800px] mx-auto px-4 md:px-6 py-5 md:py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[15px] font-medium tracking-tight text-[var(--t1)]">Fitness</h1>
        <Tabs tabs={['Training', 'Meals']} value={tab} onChange={setTab} />
      </div>

      {tab === 'Training' ? (
        <>
          <PhysicalActivity />
          <WorkoutCalendar />
        </>
      ) : (
        <>
          <MealLog />
          <MealPlan />
        </>
      )}
    </main>
  );
}
