import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashProvider } from './context/DashboardContext';
import { useAuth } from './hooks/useAuth';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TaskModal } from './components/modals/TaskModal';
import { JournalModal } from './components/modals/JournalModal';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { MealsPage } from './pages/MealsPage';
import { GoalsPage } from './pages/GoalsPage';
import { BrainPage } from './pages/BrainPage';
import { SettingsPage } from './pages/SettingsPage';

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
      <Routes>
        <Route path="/"         element={<DashboardPage />} />
        <Route path="/tasks"    element={<TasksPage />}     />
        <Route path="/projects" element={<ProjectsPage />}  />
        <Route path="/brain"    element={<BrainPage />}     />
        <Route path="/calendar" element={<CalendarPage />}  />
        <Route path="/meals"    element={<MealsPage />}     />
        <Route path="/goals"    element={<GoalsPage />}     />
        <Route path="/settings" element={<SettingsPage />}  />
      </Routes>
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
      <Layout />
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
