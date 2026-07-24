import { MealLog } from '../components/MealLog';
import { MealPlan } from '../components/MealPlan';

export function MealsPage() {
  return (
    <main className="max-w-[800px] mx-auto px-4 md:px-6 py-5 md:py-6 flex flex-col gap-4">
      <MealLog />
      <MealPlan />
    </main>
  );
}
