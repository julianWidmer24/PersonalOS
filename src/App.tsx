import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashProvider } from './context/DashboardContext';
import { PhysicalProvider } from './context/PhysicalContext';
import { useAuth } from './hooks/useAuth';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TaskModal } from './components/modals/TaskModal';
import { JournalModal } from './components/modals/JournalModal';
import { LoginPage } from './pages/LoginPage';

// Route-level code splitting: each page ships as its own chunk, loaded on
// demand, so the initial bundle only carries the shell + first route.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TasksPage     = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const ProjectsPage  = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const CalendarPage  = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const FitnessPage   = lazy(() => import('./pages/FitnessPage').then(m => ({ default: m.FitnessPage })));
const AcademicsPage = lazy(() => import('./pages/AcademicsPage').then(m => ({ default: m.AcademicsPage })));
const GoalsPage     = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const BrainPage     = lazy(() => import('./pages/BrainPage').then(m => ({ default: m.BrainPage })));
const SettingsPage  = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-5 h-5 rounded-md bg-[var(--accent)] animate-pulse" />
    </div>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--t1)] pb-16 md:pb-0">
      <TopBar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/tasks"    element={<TasksPage />}     />
          <Route path="/projects" element={<ProjectsPage />}  />
          <Route path="/brain"    element={<BrainPage />}     />
          <Route path="/calendar" element={<CalendarPage />}  />
          <Route path="/fitness"  element={<FitnessPage />}   />
          {/* /meals kept so existing bookmarks still land somewhere */}
          <Route path="/meals"    element={<Navigate to="/fitness" replace />} />
          <Route path="/academics" element={<AcademicsPage />} />
          <Route path="/goals"    element={<GoalsPage />}     />
          <Route path="/settings" element={<SettingsPage />}  />
        </Routes>
      </Suspense>
      <TaskModal />
      <JournalModal />
      <BottomNav />
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <DashProvider>
      <PhysicalProvider>
        <Layout />
      </PhysicalProvider>
    </DashProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
