import { useState, useRef } from 'react';
import { usePhysical, KIND_FROM_NAME, dayIndex, todayKey, parseRoutine, SEED_ROUTINE_TEXT } from '../hooks/usePhysical';
import { usePhysique } from '../hooks/usePhysique';
import type { PhysiqueEntry } from '../types';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';
import { IconBtn } from './shared/IconBtn';

// ── Routine importer ──────────────────────────────────────────
interface RoutineImporterProps {
  initial: string;
  onImport: (raw: string) => void;
  onClose: () => void;
}

function RoutineImporter({ initial, onImport, onClose }: RoutineImporterProps) {
  const [text, setText] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const generate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      // TODO: Connect to Claude API via Supabase Edge Function
      throw new Error('Claude integration not configured');
    } catch {
      // ignore — text still editable
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--line-hi)] bg-[var(--bg-elev)] p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">Import routine</div>
        <button onClick={onClose} className="text-[var(--t3)] hover:text-[var(--t1)] text-[10px]">close ×</button>
      </div>
      <div className="flex items-stretch gap-1.5 p-1 rounded-md bg-[var(--bg-card)] border border-[var(--line)]">
        <div className="grid place-items-center pl-1.5 text-[var(--t3)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill="currentColor" />
          </svg>
        </div>
        <input
          value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="Ask Claude: 6-day hybrid PPL + 2 runs…"
          className="flex-1 bg-transparent text-[11px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none px-1"
        />
        <button onClick={generate} disabled={loading || !aiPrompt.trim()}
          className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40">
          {loading ? '…' : 'Gen'}
        </button>
      </div>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder={'Push: bench, OHP, lateral raises\nRun: 5k easy\nPull: deadlift, rows, pullups…'}
        rows={5}
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md p-2 text-[11px] font-mono text-[var(--t1)] placeholder:text-[var(--t4)] outline-none resize-none leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--t4)]">one workout per line · "Name: ex1, ex2"</span>
        <button onClick={() => onImport(text)}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">
          Save routine
        </button>
      </div>
    </div>
  );
}

// ── Photo tile ────────────────────────────────────────────────
function PhotoTile({ entry, size = 'sm' }: { entry: PhysiqueEntry; size?: 'sm' | 'lg' }) {
  return (
    <div
      className="relative shrink-0 rounded-md overflow-hidden group"
      style={{ width: size === 'lg' ? 120 : 56, height: size === 'lg' ? 160 : 72, background: 'var(--bg-elev)' }}
    >
      {entry.dataUrl ? (
        <img src={entry.dataUrl} alt={entry.label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center"
          style={{ background: 'repeating-linear-gradient(135deg, var(--bg-elev) 0 6px, var(--bg-card-hi) 6px 12px)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--t4)]">
            <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-[8.5px] tnum text-[var(--t1)] font-medium leading-none">{entry.label}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function PhysicalActivity() {
  const { routine, setRoutine, log, setLog } = usePhysical();
  const [tab, setTab] = useState('Workout');
  const [importing, setImporting] = useState(false);
  const [entries, setEntries] = usePhysique();
  const [thisWeek, setThisWeek] = useState<PhysiqueEntry | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const workoutPhotoRef = useRef<HTMLInputElement>(null);

  const di = dayIndex();
  const idx = ((di % routine.workouts.length) + routine.workouts.length) % routine.workouts.length;
  const today = routine.workouts[idx];
  const todayK = todayKey();
  const todayEntry = log.entries[todayK];
  const isDone = !!todayEntry?.confirmed;

  const kind = today ? KIND_FROM_NAME(today.name) : KIND_FROM_NAME('');

  const markDone = () => {
    setLog(l => ({
      entries: { ...l.entries, [todayK]: { confirmed: true, photo: l.entries[todayK]?.photo || null, idx } },
      streak: (l.streak || 0) + (l.entries[todayK]?.confirmed ? 0 : 1),
    }));
  };

  const unmark = () => {
    setLog(l => {
      const next = { ...l.entries };
      delete next[todayK];
      return { entries: next, streak: Math.max(0, (l.streak || 0) - 1) };
    });
  };

  const onWorkoutPhoto = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setLog(l => ({
        ...l,
        entries: {
          ...l.entries,
          [todayK]: { ...(l.entries[todayK] || { idx }), photo: r.result as string, confirmed: l.entries[todayK]?.confirmed ?? false },
        },
      }));
    };
    r.readAsDataURL(file);
  };

  const importRoutine = (raw: string) => {
    const workouts = parseRoutine(raw);
    if (!workouts.length) return;
    setRoutine({ workouts, raw, importedAt: 'Just now' });
    setImporting(false);
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { d, key: todayKey(d), entry: log.entries[todayKey(d)] };
  });

  const onPhysiqueFile = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const entry: PhysiqueEntry = { week: 14, label: 'Week 14', date: 'Today', dataUrl: r.result as string };
      setThisWeek(entry);
      try { localStorage.setItem('pos:physique:current', JSON.stringify(entry)); } catch { /* ignore */ }
    };
    r.readAsDataURL(file);
  };

  const commitWeekly = () => {
    if (!thisWeek) return;
    setEntries(es => [thisWeek, ...es]);
    setThisWeek(null);
    try { localStorage.removeItem('pos:physique:current'); } catch { /* ignore */ }
  };

  return (
    <Card
      title="Physical activity"
      kicker={`${log.streak || 0}-day streak`}
      action={
        <div className="flex items-center gap-1.5">
          <Tabs tabs={['Workout', 'Check-in']} value={tab} onChange={setTab} />
          {tab === 'Workout' && (
            <IconBtn title="Import routine" onClick={() => setImporting(v => !v)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v6m0 0L3.5 5M6 7.5L8.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </IconBtn>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-2.5">
        {tab === 'Workout' && (
          <>
            {importing && (
              <RoutineImporter
                initial={routine.raw || SEED_ROUTINE_TEXT}
                onImport={importRoutine}
                onClose={() => setImporting(false)}
              />
            )}

            <div className="rounded-lg p-3 border border-[var(--line)]" style={{ background: kind.bg }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[18px] leading-none" style={{ color: kind.fg }}>{kind.icon}</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
                      Today · day {idx + 1} of {routine.workouts.length}
                    </div>
                    <div className="text-[15px] font-medium text-[var(--t1)] leading-tight mt-0.5">
                      {today?.name || 'Rest'}
                    </div>
                  </div>
                </div>
                {isDone && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ color: '#6ee7b7', background: 'rgba(110,231,183,.12)' }}>
                    ✓ done
                  </span>
                )}
              </div>
              {today?.exercises?.length > 0 && (
                <ul className="flex flex-wrap gap-1 mt-2">
                  {today.exercises.map((ex, i) => (
                    <li key={i} className="px-1.5 py-0.5 rounded text-[10.5px] text-[var(--t2)] bg-[var(--bg-card)] border border-[var(--line)]">{ex}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center gap-1.5">
                <button
                  onClick={isDone ? unmark : markDone}
                  className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                    isDone
                      ? 'border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]'
                      : 'bg-[var(--accent)] text-[var(--bg)] hover:opacity-90'
                  }`}
                >
                  {isDone ? 'Undo' : '✓ Mark done'}
                </button>
                <button
                  onClick={() => workoutPhotoRef.current?.click()}
                  className="px-2 py-1.5 rounded-md border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]"
                  title="Add photo"
                >
                  {todayEntry?.photo ? (
                    <img src={todayEntry.photo} alt="" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M8 6l1.5-2h5L16 6" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
                <input ref={workoutPhotoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => onWorkoutPhoto(e.target.files?.[0])} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Last 7 days</div>
                <div className="text-[10.5px] text-[var(--t3)] tnum">{days.filter(d => d.entry?.confirmed).length}/7</div>
              </div>
              <div className="flex gap-1">
                {days.map((d, i) => {
                  const w = routine.workouts[((d.entry?.idx ?? dayIndex(d.d)) % routine.workouts.length + routine.workouts.length) % routine.workouts.length];
                  const k = KIND_FROM_NAME(w?.name || '');
                  const done = !!d.entry?.confirmed;
                  const isToday = i === 6;
                  return (
                    <div
                      key={d.key}
                      className={`flex-1 rounded-md p-1.5 border ${isToday ? 'border-[var(--accent)]' : 'border-[var(--line)]'} relative overflow-hidden`}
                      style={done ? { background: k.bg } : {}}
                    >
                      {d.entry?.photo && (
                        <img src={d.entry.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      )}
                      <div className="relative">
                        <div className="text-[8.5px] uppercase tracking-wider text-[var(--t3)]">
                          {d.d.toLocaleDateString([], { weekday: 'short' }).slice(0, 1)}
                        </div>
                        <div className="text-[10px] tnum text-[var(--t2)]">{d.d.getDate()}</div>
                        <div className="text-[12px] mt-0.5" style={{ color: done ? k.fg : 'var(--t4)' }}>
                          {done ? '✓' : k.icon}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'Check-in' && (
          <>
            {!thisWeek ? (
              <button
                onClick={() => photoRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-1', 'ring-[var(--accent)]'); }}
                onDragLeave={e => e.currentTarget.classList.remove('ring-1', 'ring-[var(--accent)]')}
                onDrop={e => { e.preventDefault(); onPhysiqueFile(e.dataTransfer.files?.[0]); }}
                className="h-28 rounded-lg border border-dashed border-[var(--line-hi)] grid place-items-center hover:border-[var(--t3)] hover:bg-[var(--bg-elev)] transition-all group"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-elev)] border border-[var(--line-hi)] grid place-items-center text-[var(--t2)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M8 6l1.5-2h5L16 6" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </div>
                  <div className="text-[12px] text-[var(--t1)] font-medium">Add week 14 photo</div>
                  <div className="text-[10px] text-[var(--t3)]">drop or click · on-device</div>
                </div>
              </button>
            ) : (
              <div className="flex gap-3 items-stretch">
                <div className="relative rounded-md overflow-hidden border border-[var(--line-hi)]" style={{ width: 92, height: 116 }}>
                  <img src={thisWeek.dataUrl!} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Pending</div>
                    <div className="text-[13px] text-[var(--t1)] font-medium mt-0.5">Week 14 · Today</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={commitWeekly}
                      className="flex-1 py-1 text-[11px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">
                      Log
                    </button>
                    <button onClick={() => photoRef.current?.click()}
                      className="px-2 py-1 text-[11px] rounded-md border border-[var(--line-hi)] text-[var(--t2)]">
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={e => onPhysiqueFile(e.target.files?.[0])} />

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Timeline</div>
                <div className="text-[10.5px] text-[var(--t3)] tnum">{entries.length} weeks</div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pos-scroll pb-1">
                {entries.map(e => <PhotoTile key={e.week} entry={e} size="sm" />)}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
