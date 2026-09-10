import { TaskCRM } from '../components/TaskCRM';
import { InProgress } from '../components/InProgress';

export function TasksPage() {
  return (
    <main className="max-w-[900px] mx-auto px-4 md:px-6 py-5 md:py-6 space-y-4">
      {/* Renders nothing unless something is actually running. */}
      <InProgress />
      <TaskCRM />
    </main>
  );
}
