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
import { WidgetGrid, Widget } from '../components/shared/WidgetGrid';

export function DashboardPage() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <section className="mb-4 md:mb-5">
        <HeroGreeting variant="lg" />
      </section>

      <section className="mb-4 md:mb-5">
        <KPIStripResponsive />
      </section>

      <WidgetGrid>
        <Widget key="key-tasks" id="key-tasks"><KeyTasks /></Widget>
        <Widget key="projects" id="projects"><Projects /></Widget>
        <Widget key="task-crm" id="task-crm"><TaskCRM /></Widget>
        <Widget key="calendar" id="calendar"><Calendar /></Widget>
        <Widget key="habits" id="habits"><Habits /></Widget>
        <Widget key="goals" id="goals"><Goals /></Widget>
        <Widget key="physical" id="physical"><PhysicalActivity /></Widget>
        <Widget key="meal-plan" id="meal-plan"><MealPlan /></Widget>
        <Widget key="health" id="health"><Health /></Widget>
        <Widget key="finance" id="finance"><Finance /></Widget>
        <Widget key="journal" id="journal"><Journal /></Widget>
      </WidgetGrid>

      <footer className="mt-8 pb-4 text-center text-[10.5px] text-[var(--t4)] tnum">
        Personal OS · Mission Control
        <span className="hidden md:inline"> · drag a card's bottom-right corner to resize</span>
      </footer>
    </main>
  );
}
