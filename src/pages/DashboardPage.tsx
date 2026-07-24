import { HeroGreeting } from '../components/HeroGreeting';
import { KPIStripResponsive } from '../components/KPIStrip';
import { KeyTasks } from '../components/KeyTasks';
import { Projects } from '../components/Projects';
import { TaskCRM } from '../components/TaskCRM';
import { Calendar } from '../components/Calendar';
import { Habits } from '../components/Habits';
import { Goals } from '../components/Goals';
import { PhysicalActivity } from '../components/PhysicalActivity';
import { MealPlan } from '../components/MealPlan';
import { Health } from '../components/Health';
import { Finance } from '../components/Finance';
import { Journal } from '../components/Journal';

export function DashboardPage() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <section className="mb-4 md:mb-5">
        <HeroGreeting variant="lg" />
      </section>

      <section className="mb-4 md:mb-5">
        <KPIStripResponsive />
      </section>

      <div className="pos-masonry">
        <div className="pos-masonry-item"><KeyTasks /></div>
        <div className="pos-masonry-item"><Projects /></div>
        <div className="pos-masonry-item"><TaskCRM /></div>
        <div className="pos-masonry-item"><Calendar /></div>
        <div className="pos-masonry-item"><Habits /></div>
        <div className="pos-masonry-item"><Goals /></div>
        <div className="pos-masonry-item"><PhysicalActivity /></div>
        <div className="pos-masonry-item"><MealPlan /></div>
        <div className="pos-masonry-item"><Health /></div>
        <div className="pos-masonry-item"><Finance /></div>
        <div className="pos-masonry-item"><Journal /></div>
      </div>

      <footer className="mt-8 pb-4 text-center text-[10.5px] text-[var(--t4)] tnum">
        Personal OS · Mission Control
      </footer>
    </main>
  );
}
