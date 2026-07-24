import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../hooks/useAuth';
import type { Habit } from '../types';
import { Tabs } from './shared/Tabs';

// ── Habits tab ────────────────────────────────────────────────
function HabitsSettings() {
  const { habits, addHabit: addHabitDb, updateHabit, removeHabit: removeHabitDb } = useDashboard();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const addHabit = () => {
    if (!newName.trim()) return;
    addHabitDb({ name: newName.trim() });
    setNewName('');
    setAdding(false);
  };

  const removeHabit = (id: string) => removeHabitDb(id);

  const saveEdit = (id: string) => {
    updateHabit(id, { name: editName });
    setEditId(null);
  };

  const startEdit = (h: Habit) => { setEditId(h.id); setEditName(h.name); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-[var(--t1)]">Daily habits</div>
        <button
          onClick={() => setAdding(a => !a)}
          className="px-2.5 py-1 text-[11.5px] bg-[var(--accent)] text-[var(--bg)] rounded-md font-medium hover:opacity-90"
        >
          + Add
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/40">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            placeholder="Habit name…"
            className="flex-1 bg-[var(--bg-card)] border border-[var(--line)] rounded-lg px-3 py-1.5 text-[12.5px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
          />
          <button onClick={addHabit} className="px-3 py-1.5 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-[11.5px] font-medium">Save</button>
          <button onClick={() => setAdding(false)} className="px-2.5 py-1.5 text-[var(--t3)] hover:text-[var(--t1)] text-[11.5px] transition-colors">Cancel</button>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {habits.map(h => (
          <li key={h.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/30 hover:bg-[var(--bg-elev)]/70 transition-colors">
            <span className="text-[16px] shrink-0">{h.icon}</span>
            {editId === h.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(h.id); if (e.key === 'Escape') setEditId(null); }}
                className="flex-1 bg-transparent text-[12.5px] text-[var(--t1)] outline-none border-b border-[var(--accent)]"
              />
            ) : (
              <span className="flex-1 text-[12.5px] text-[var(--t1)]">{h.name}</span>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-[var(--t4)] tnum">{h.streak}d streak</span>
              {editId === h.id ? (
                <>
                  <button onClick={() => saveEdit(h.id)} className="px-2 py-0.5 text-[10.5px] bg-[var(--accent)] text-[var(--bg)] rounded font-medium">Save</button>
                  <button onClick={() => setEditId(null)} className="px-2 py-0.5 text-[10.5px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors">Cancel</button>
                </>
              ) : (
                <button onClick={() => startEdit(h)} className="px-2 py-0.5 text-[10.5px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors">Edit</button>
              )}
              <button onClick={() => removeHabit(h.id)} className="px-2 py-0.5 text-[10.5px] text-[var(--red)] hover:opacity-80 transition-opacity">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Preferences tab ───────────────────────────────────────────
function PreferencesSettings() {
  const [calorieGoal, setCalorieGoal] = useState(() => {
    return parseInt(localStorage.getItem('pos:calorie-goal') || '2400');
  });
  const [proteinGoal, setProteinGoal] = useState(() => {
    return parseInt(localStorage.getItem('pos:protein-goal') || '150');
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('pos:calorie-goal', String(calorieGoal));
    localStorage.setItem('pos:protein-goal', String(proteinGoal));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[13px] font-medium text-[var(--t1)]">Nutrition goals</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[var(--t2)] font-medium">Daily calories</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={calorieGoal}
              onChange={e => setCalorieGoal(Number(e.target.value))}
              className="w-24 bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg px-3 py-2 text-[13px] text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-colors tnum"
            />
            <span className="text-[11px] text-[var(--t3)]">kcal</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[var(--t2)] font-medium">Daily protein</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={proteinGoal}
              onChange={e => setProteinGoal(Number(e.target.value))}
              className="w-24 bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg px-3 py-2 text-[13px] text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-colors tnum"
            />
            <span className="text-[11px] text-[var(--t3)]">g</span>
          </div>
        </div>
      </div>
      <button
        onClick={save}
        className="self-start px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity"
      >
        {saved ? '✓ Saved' : 'Save preferences'}
      </button>
    </div>
  );
}

// ── Integrations tab ──────────────────────────────────────────
function IntegrationRow({ name, description, icon, connected }: { name: string; description: string; icon: string; connected?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--line)] grid place-items-center text-[16px]">{icon}</div>
        <div>
          <div className="text-[12.5px] font-medium text-[var(--t1)]">{name}</div>
          <div className="text-[11px] text-[var(--t3)]">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <span className="text-[10.5px] text-[var(--green)] px-2 py-0.5 rounded-full bg-[var(--green)]/10">Connected</span>
        ) : (
          <button className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-[11.5px] text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors">
            Connect {/* TODO: implement OAuth flow */}
          </button>
        )}
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-medium text-[var(--t1)]">Connected accounts</div>
      <IntegrationRow name="Google Calendar" description="Sync calendar events to your dashboard" icon="📅" />
      <IntegrationRow name="Google Sheets" description="Pull finance data from your spreadsheet" icon="📊" />
      <IntegrationRow name="Telegram Bot" description="Voice input pipeline via Telegram" icon="✈️" />
      <IntegrationRow name="Claude AI" description="AI classification, summaries, and queries" icon="◈" />
      <div className="mt-2 p-3 rounded-xl bg-[var(--amber)]/5 border border-[var(--amber)]/20 text-[11.5px] text-[var(--amber)]">
        OAuth flows and API key management require a deployed backend. See the Supabase edge functions in <code className="text-[10.5px]">supabase/functions/</code>.
      </div>
    </div>
  );
}

// ── Data tab ──────────────────────────────────────────────────
function DataSettings() {
  const { tasks, habits, journal, goals, projects } = useDashboard();
  const { signOut } = useAuth();
  const [exported, setExported] = useState(false);

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      tasks,
      habits,
      journal,
      goals,
      projects,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[13px] font-medium text-[var(--t1)] mb-1">Export data</div>
        <p className="text-[11.5px] text-[var(--t3)] mb-3">
          Download all your tasks, habits, journal entries, goals, and projects as a JSON file.
          This is your local data only — Supabase data can be exported from the Supabase dashboard.
        </p>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--line)] text-[12px] text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {exported ? '✓ Downloaded' : 'Download JSON'}
        </button>
      </div>

      <div className="border-t border-[var(--line)] pt-5">
        <div className="text-[13px] font-medium text-[var(--t1)] mb-1">Storage</div>
        <p className="text-[11.5px] text-[var(--t3)] mb-3">
          Data is currently stored in your browser's localStorage. Connecting Supabase will enable cross-device sync and automatic backups.
        </p>
        <div className="flex flex-col gap-1.5 text-[11.5px] text-[var(--t3)]">
          <div>{tasks.length} tasks · {habits.length} habits · {journal.length} journal entries</div>
          <div>{goals.length} goals · {projects.length} projects</div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] pt-5">
        <div className="text-[13px] font-medium text-[var(--t1)] mb-3">Account</div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-lg border border-[var(--red)]/40 text-[12px] text-[var(--red)] hover:bg-[var(--red)]/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Main Settings component ───────────────────────────────────
export function Settings() {
  const [tab, setTab] = useState('Habits');

  return (
    <div className="flex flex-col gap-5">
      <Tabs tabs={['Habits', 'Preferences', 'Integrations', 'Data']} value={tab} onChange={setTab} />
      <div>
        {tab === 'Habits'       && <HabitsSettings />}
        {tab === 'Preferences'  && <PreferencesSettings />}
        {tab === 'Integrations' && <IntegrationsSettings />}
        {tab === 'Data'         && <DataSettings />}
      </div>
    </div>
  );
}
