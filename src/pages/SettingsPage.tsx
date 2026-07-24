import { Settings } from '../components/Settings';

export function SettingsPage() {
  return (
    <main className="max-w-[800px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--t1)]">Settings</h1>
        <p className="mt-0.5 text-[12px] text-[var(--t3)]">Manage habits, preferences, integrations, and your data.</p>
      </div>
      <Settings />
    </main>
  );
}
