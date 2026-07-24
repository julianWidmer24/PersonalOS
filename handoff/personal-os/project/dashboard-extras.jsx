// dashboard-extras.jsx — Physical Activity (workout + check-in) + Meal Plan

const PHYSIQUE_KEY = 'pos:physique';
const MEALPLAN_KEY = 'pos:mealplan';
const ROUTINE_KEY  = 'pos:routine';
const WORKOUT_LOG_KEY = 'pos:workout-log';

// ────────────────────────────────────────────────────────────────
// Workout routine — seed list + parse
// ────────────────────────────────────────────────────────────────
const SEED_ROUTINE_TEXT =
`Push: bench press, overhead press, incline DB press, lateral raises, tricep pushdowns
Run: 5k easy Z2
Pull: deadlift, barbell row, weighted pullups, face pulls, hammer curls
Legs: back squat, Romanian deadlift, walking lunges, calf raises
Run: 8 x 400m intervals
Upper: weighted dips, chinups, landmine press, rear delt flyes
Long run: 10k zone 2`;

function parseRoutine(text) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const idx = l.indexOf(':');
      const name = idx > 0 ? l.slice(0, idx).trim() : l.trim();
      const exercises = idx > 0
        ? l.slice(idx + 1).split(',').map(s => s.trim()).filter(Boolean)
        : [];
      return { id: 'w' + i, name, exercises };
    });
}

const KIND_FROM_NAME = (name) => {
  const n = name.toLowerCase();
  if (n.includes('run') || n.includes('cardio'))  return { fg: '#6ee7b7', bg: 'rgba(110,231,183,.12)', icon: '🏃', label: 'run' };
  if (n.includes('rest'))                         return { fg: '#9ca3af', bg: 'rgba(156,163,175,.12)', icon: '◯', label: 'rest' };
  if (n.includes('push') || n.includes('upper'))  return { fg: '#93c5fd', bg: 'rgba(147,197,253,.12)', icon: '▲', label: 'push' };
  if (n.includes('pull'))                         return { fg: '#c4b5fd', bg: 'rgba(196,181,253,.12)', icon: '▼', label: 'pull' };
  if (n.includes('leg') || n.includes('lower'))   return { fg: '#f5c451', bg: 'rgba(245,196,81,.12)',  icon: '■', label: 'legs' };
  return { fg: '#e5e5e5', bg: 'rgba(229,229,229,.10)', icon: '◆', label: 'lift' };
};

function loadRoutine() {
  try {
    const v = JSON.parse(localStorage.getItem(ROUTINE_KEY) || 'null');
    if (v && v.workouts?.length) return v;
  } catch {}
  return { workouts: parseRoutine(SEED_ROUTINE_TEXT), raw: SEED_ROUTINE_TEXT, importedAt: 'Seeded' };
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function dayIndex(d = new Date()) {
  // Days since fixed epoch — stable across timezone shifts
  return Math.floor((d - new Date(2026, 0, 1)) / 86400000);
}

function loadLog() {
  try {
    const v = JSON.parse(localStorage.getItem(WORKOUT_LOG_KEY) || 'null');
    if (v && v.entries) return v;
  } catch {}
  // Seed: 5 completed days in the last 7, with the most recent two
  const today = new Date();
  const entries = {};
  const mkDate = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return todayKey(d); };
  // last 7 days (offset -6..0): mark some done
  [-6, -5, -3, -2, -1].forEach((o, i) => {
    const dt = new Date(today); dt.setDate(dt.getDate() + o);
    entries[mkDate(o)] = { confirmed: true, photo: null, idx: dayIndex(dt) };
  });
  return { entries, streak: 2 };
}

function usePhysical() {
  const [routine, setRoutine] = React.useState(loadRoutine);
  const [log, setLog] = React.useState(loadLog);
  React.useEffect(() => {
    try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine)); } catch {}
    window.dispatchEvent(new Event('pos:routine-changed'));
  }, [routine]);
  React.useEffect(() => {
    try { localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(log)); } catch {}
    window.dispatchEvent(new Event('pos:log-changed'));
  }, [log]);
  return { routine, setRoutine, log, setLog };
}

// ────────────────────────────────────────────────────────────────
// Physique photos (weekly)
// ────────────────────────────────────────────────────────────────
function loadPhysique() {
  try {
    const v = JSON.parse(localStorage.getItem(PHYSIQUE_KEY) || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  return [
    { week: 13, label: 'Week 13', date: 'May 12', dataUrl: null },
    { week: 12, label: 'Week 12', date: 'May 5',  dataUrl: null },
    { week: 11, label: 'Week 11', date: 'Apr 28', dataUrl: null },
    { week: 10, label: 'Week 10', date: 'Apr 21', dataUrl: null },
  ];
}

function usePhysique() {
  const [entries, setEntries] = React.useState(loadPhysique);
  React.useEffect(() => { try { localStorage.setItem(PHYSIQUE_KEY, JSON.stringify(entries)); } catch {} }, [entries]);
  return [entries, setEntries];
}

function PhotoTile({ entry, size = 'sm' }) {
  return (
    <div className="relative shrink-0 rounded-md overflow-hidden group"
      style={{ width: size === 'lg' ? 120 : 56, height: size === 'lg' ? 160 : 72, background: 'var(--bg-elev)' }}>
      {entry.dataUrl ? (
        <img src={entry.dataUrl} alt={entry.label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center"
          style={{ background: 'repeating-linear-gradient(135deg, var(--bg-elev) 0 6px, var(--bg-card-hi) 6px 12px)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--t4)]">
            <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-[8.5px] tnum text-[var(--t1)] font-medium leading-none">{entry.label}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Routine importer (inline drawer)
// ────────────────────────────────────────────────────────────────
function RoutineImporter({ initial, onImport, onClose }) {
  const [text, setText] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');

  const generate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const sys = `You generate a workout routine. Reply with one workout per line in this format:\n"Push: bench press, OHP, incline DB press"\nUse 5-7 workouts (a week cycle). Hybrid athletes need 2 runs/week. Output ONLY the routine, no preamble.`;
      const out = await window.claude.complete({
        messages: [{ role: 'user', content: sys + '\n\nRequest: ' + aiPrompt }],
      });
      // Strip preamble — keep only lines that look like workouts
      const cleaned = out.split('\n').map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.toLowerCase().startsWith('here') && !l.startsWith('```'))
        .join('\n');
      setText(cleaned);
    } catch (e) {
      // ignore — text still editable
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-lg border border-[var(--line-hi)] bg-[var(--bg-elev)] p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">Import routine</div>
        <button onClick={onClose} className="text-[var(--t3)] hover:text-[var(--t1)] text-[10px]">close ×</button>
      </div>
      <div className="flex items-stretch gap-1.5 p-1 rounded-md bg-[var(--bg-card)] border border-[var(--line)]">
        <div className="grid place-items-center pl-1.5 text-[var(--t3)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill="currentColor"/></svg>
        </div>
        <input
          value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          placeholder="Ask Claude: 6-day hybrid PPL + 2 runs…"
          className="flex-1 bg-transparent text-[11px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none px-1" />
        <button onClick={generate} disabled={loading || !aiPrompt.trim()}
          className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40">
          {loading ? '…' : 'Gen'}
        </button>
      </div>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'Push: bench, OHP, lateral raises\nRun: 5k easy\nPull: deadlift, rows, pullups…'}
        rows={5}
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md p-2 text-[11px] font-mono text-[var(--t1)] placeholder:text-[var(--t4)] outline-none resize-none leading-relaxed" />
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

// ────────────────────────────────────────────────────────────────
// Physical Activity — workout + check-in (tabs)
// ────────────────────────────────────────────────────────────────
function PhysicalActivity({ variant = 'md' }) {
  const { routine, setRoutine, log, setLog } = usePhysical();
  const [tab, setTab] = React.useState('Workout');
  const [importing, setImporting] = React.useState(false);
  const [entries, setEntries] = usePhysique();
  const [thisWeek, setThisWeek] = React.useState(null);
  const photoRef = React.useRef(null);
  const workoutPhotoRef = React.useRef(null);

  // Today's workout
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
  const onWorkoutPhoto = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setLog(l => ({
        ...l,
        entries: { ...l.entries, [todayK]: { ...(l.entries[todayK] || { idx }), photo: r.result, confirmed: l.entries[todayK]?.confirmed ?? false } },
      }));
    };
    r.readAsDataURL(file);
  };
  const importRoutine = (raw) => {
    const workouts = parseRoutine(raw);
    if (!workouts.length) return;
    setRoutine({ workouts, raw, importedAt: 'Just now' });
    setImporting(false);
  };

  // Last 7 days strip
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { d, key: todayKey(d), entry: log.entries[todayKey(d)] };
  });

  // ── Check-in tab handlers ──
  React.useEffect(() => {
    try {
      const cur = JSON.parse(localStorage.getItem(PHYSIQUE_KEY + ':current') || 'null');
      if (cur) setThisWeek(cur);
    } catch {}
  }, []);
  const onPhysiqueFile = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const entry = { week: 14, label: 'Week 14', date: 'Today', dataUrl: r.result };
      setThisWeek(entry);
      try { localStorage.setItem(PHYSIQUE_KEY + ':current', JSON.stringify(entry)); } catch {}
    };
    r.readAsDataURL(file);
  };
  const commitWeekly = () => {
    if (!thisWeek) return;
    setEntries(es => [thisWeek, ...es]);
    setThisWeek(null);
    try { localStorage.removeItem(PHYSIQUE_KEY + ':current'); } catch {}
  };

  return (
    <Card title="Physical activity" kicker={`${log.streak || 0}-day streak`}
      action={
        <div className="flex items-center gap-1.5">
          <Tabs tabs={['Workout', 'Check-in']} value={tab} onChange={setTab} />
          {tab === 'Workout' && (
            <IconBtn title="Import routine" onClick={() => setImporting(v => !v)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v6m0 0L3.5 5M6 7.5L8.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </IconBtn>
          )}
        </div>
      }>
      <div className="flex flex-col gap-2.5">
        {tab === 'Workout' && (
          <>
            {importing && (
              <RoutineImporter
                initial={routine.raw || SEED_ROUTINE_TEXT}
                onImport={importRoutine}
                onClose={() => setImporting(false)} />
            )}

            {/* Today's workout */}
            <div className="rounded-lg p-3 border border-[var(--line)]"
              style={{ background: kind.bg }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[18px] leading-none" style={{ color: kind.fg }}>{kind.icon}</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
                      Today · day {idx + 1} of {routine.workouts.length}
                    </div>
                    <div className="text-[15px] font-medium text-[var(--t1)] leading-tight mt-0.5">{today?.name || 'Rest'}</div>
                  </div>
                </div>
                {isDone && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ color: '#6ee7b7', background: 'rgba(110,231,183,.12)' }}>✓ done</span>
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
                <button onClick={isDone ? unmark : markDone}
                  className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                    isDone
                      ? 'border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]'
                      : 'bg-[var(--accent)] text-[var(--bg)] hover:opacity-90'
                  }`}>
                  {isDone ? 'Undo' : '✓ Mark done'}
                </button>
                <button onClick={() => workoutPhotoRef.current?.click()}
                  className="px-2 py-1.5 rounded-md border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]" title="Add photo">
                  {todayEntry?.photo ? (
                    <img src={todayEntry.photo} alt="" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M8 6l1.5-2h5L16 6" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  )}
                </button>
                <input ref={workoutPhotoRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => onWorkoutPhoto(e.target.files?.[0])} />
              </div>
            </div>

            {/* 7-day strip */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Last 7 days</div>
                <div className="text-[10.5px] text-[var(--t3)] tnum">{days.filter(d=>d.entry?.confirmed).length}/7</div>
              </div>
              <div className="flex gap-1">
                {days.map((d, i) => {
                  const w = routine.workouts[((d.entry?.idx ?? dayIndex(d.d)) % routine.workouts.length + routine.workouts.length) % routine.workouts.length];
                  const k = KIND_FROM_NAME(w?.name || '');
                  const done = !!d.entry?.confirmed;
                  const isToday = i === 6;
                  return (
                    <div key={d.key} className={`flex-1 rounded-md p-1.5 border ${isToday ? 'border-[var(--accent)]' : 'border-[var(--line)]'} relative overflow-hidden`}
                      style={done ? { background: k.bg } : {}}>
                      {d.entry?.photo && (
                        <img src={d.entry.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      )}
                      <div className="relative">
                        <div className="text-[8.5px] uppercase tracking-wider text-[var(--t3)]">{d.d.toLocaleDateString([],{weekday:'short'}).slice(0,1)}</div>
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
              <button onClick={() => photoRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-1','ring-[var(--accent)]'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('ring-1','ring-[var(--accent)]')}
                onDrop={(e) => { e.preventDefault(); onPhysiqueFile(e.dataTransfer.files?.[0]); }}
                className="h-28 rounded-lg border border-dashed border-[var(--line-hi)] grid place-items-center hover:border-[var(--t3)] hover:bg-[var(--bg-elev)] transition-all group">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-elev)] border border-[var(--line-hi)] grid place-items-center text-[var(--t2)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M8 6l1.5-2h5L16 6" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  </div>
                  <div className="text-[12px] text-[var(--t1)] font-medium">Add week 14 photo</div>
                  <div className="text-[10px] text-[var(--t3)]">drop or click · on-device</div>
                </div>
              </button>
            ) : (
              <div className="flex gap-3 items-stretch">
                <div className="relative rounded-md overflow-hidden border border-[var(--line-hi)]" style={{ width: 92, height: 116 }}>
                  <img src={thisWeek.dataUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Pending</div>
                    <div className="text-[13px] text-[var(--t1)] font-medium mt-0.5">Week 14 · Today</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={commitWeekly}
                      className="flex-1 py-1 text-[11px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Log</button>
                    <button onClick={() => photoRef.current?.click()}
                      className="px-2 py-1 text-[11px] rounded-md border border-[var(--line-hi)] text-[var(--t2)]">Replace</button>
                  </div>
                </div>
              </div>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onPhysiqueFile(e.target.files?.[0])} />

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

// ────────────────────────────────────────────────────────────────
// Meal Plan — generate from Claude
// ────────────────────────────────────────────────────────────────
function loadMealPlan() {
  try {
    const v = JSON.parse(localStorage.getItem(MEALPLAN_KEY) || 'null');
    if (v && v.meals) return v;
  } catch {}
  return SEED_MEAL_PLAN;
}

const SEED_MEAL_PLAN = {
  prompt: 'High-protein vegetarian, 4 meals/day, ~2400 kcal, budget Trader Joe’s',
  generatedAt: 'May 19',
  totals: { kcal: 2380, protein: 162, carbs: 248, fat: 78 },
  meals: [
    { id: 'm1', slot: 'Breakfast', name: 'Greek yogurt parfait + oats', kcal: 480, protein: 36,
      ingredients: [
        { name: 'Nonfat Greek yogurt', qty: '300g' },
        { name: 'Rolled oats', qty: '50g' },
        { name: 'Mixed berries', qty: '100g' },
        { name: 'Honey', qty: '1 tbsp' },
        { name: 'Sliced almonds', qty: '15g' },
      ],
      steps: [
        'Stir yogurt with a splash of milk to loosen.',
        'Layer with oats and a third of the berries in a tall glass.',
        'Repeat. Top with honey and almonds.',
        'Eat or fridge overnight for soaked oats.',
      ]
    },
    { id: 'm2', slot: 'Lunch', name: 'Crispy tofu rice bowl', kcal: 720, protein: 48,
      ingredients: [
        { name: 'Extra-firm tofu', qty: '200g' },
        { name: 'Jasmine rice', qty: '90g dry' },
        { name: 'Edamame', qty: '100g' },
        { name: 'Soy sauce', qty: '2 tbsp' },
        { name: 'Sesame oil', qty: '1 tsp' },
        { name: 'Scallions', qty: '2' },
      ],
      steps: [
        'Press tofu 10m, cube. Toss with 1 tbsp cornstarch.',
        'Pan-fry in 2 tsp oil until each face is golden.',
        'Cook rice. Steam edamame.',
        'Whisk soy, sesame oil, splash of rice vinegar. Drizzle.',
        'Plate rice → tofu → edamame → scallions.',
      ]
    },
    { id: 'm3', slot: 'Snack', name: 'Cottage cheese + apple', kcal: 280, protein: 24,
      ingredients: [
        { name: 'Low-fat cottage cheese', qty: '200g' },
        { name: 'Honeycrisp apple', qty: '1' },
        { name: 'Cinnamon', qty: 'pinch' },
      ],
      steps: [
        'Slice apple thin.',
        'Bowl the cottage cheese, top with apple, dust cinnamon.',
      ]
    },
    { id: 'm4', slot: 'Dinner', name: 'Black bean & sweet potato tacos', kcal: 900, protein: 54,
      ingredients: [
        { name: 'Sweet potato', qty: '1 large' },
        { name: 'Canned black beans', qty: '1 can' },
        { name: 'Corn tortillas', qty: '4' },
        { name: 'Shredded cheese', qty: '60g' },
        { name: 'Avocado', qty: '1/2' },
        { name: 'Lime', qty: '1' },
        { name: 'Cumin, smoked paprika', qty: '1 tsp ea' },
      ],
      steps: [
        '425°F: cube sweet potato, toss oil+spices, roast 25m.',
        'Heat beans with cumin and a splash of bean liquid.',
        'Warm tortillas in dry pan.',
        'Assemble: beans → sweet potato → cheese → avocado → lime.',
      ]
    },
  ],
};

function aggregateIngredients(meals) {
  const map = new Map();
  meals.forEach(m => m.ingredients.forEach(ing => {
    const key = ing.name.toLowerCase();
    if (!map.has(key)) map.set(key, { name: ing.name, qty: ing.qty, count: 1 });
    else { const e = map.get(key); e.count += 1; e.qty = e.qty + ' + ' + ing.qty; }
  }));
  return Array.from(map.values());
}

function MealPlan({ variant = 'md' }) {
  const [plan, setPlan] = React.useState(loadMealPlan);
  const [tab, setTab] = React.useState('Meals');
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [openMeal, setOpenMeal] = React.useState(null);
  const [checked, setChecked] = React.useState(new Set());

  React.useEffect(() => { try { localStorage.setItem(MEALPLAN_KEY, JSON.stringify(plan)); } catch {} }, [plan]);

  const generate = async () => {
    const q = prompt.trim();
    if (!q) return;
    setLoading(true); setError(null);
    try {
      const sys = `You generate weekday meal plans for a UC Berkeley student. Reply with STRICT JSON only, no commentary. Schema:
{"prompt":"…","totals":{"kcal":n,"protein":n,"carbs":n,"fat":n},"meals":[{"id":"m1","slot":"Breakfast|Lunch|Snack|Dinner","name":"…","kcal":n,"protein":n,"ingredients":[{"name":"…","qty":"…"}],"steps":["…"]}]}
Use 3-5 meals. Steps are concise imperatives. Quantities use grams or common units.`;
      const text = await window.claude.complete({
        messages: [{ role: 'user', content: sys + '\n\nUser request: ' + q }],
      });
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Could not find JSON in response');
      const parsed = JSON.parse(m[0]);
      if (!parsed.meals || !Array.isArray(parsed.meals)) throw new Error('Missing meals[]');
      parsed.generatedAt = 'Just now';
      parsed.prompt = q;
      setPlan(parsed);
      setPrompt('');
      setTab('Meals');
    } catch (e) {
      setError(e.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const ingredients = React.useMemo(() => aggregateIngredients(plan.meals), [plan]);

  const SLOT_COLORS = {
    Breakfast: { fg: '#f5c451', bg: 'rgba(245,196,81,.10)' },
    Lunch:     { fg: '#6ee7b7', bg: 'rgba(110,231,183,.10)' },
    Snack:     { fg: '#93c5fd', bg: 'rgba(147,197,253,.10)' },
    Dinner:    { fg: '#c4b5fd', bg: 'rgba(196,181,253,.10)' },
  };

  return (
    <Card title="Meal plan" kicker={`${plan.meals.length} meals · ${plan.totals.kcal} kcal · ${plan.totals.protein}g P`}
      action={<Tabs tabs={['Meals', 'Ingredients', 'Steps']} value={tab} onChange={setTab} />}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-stretch gap-1.5 p-1 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
          <div className="grid place-items-center pl-2 text-[var(--t3)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill="currentColor"/></svg>
          </div>
          <input
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder={loading ? 'Generating…' : 'Ask Claude: high-protein vegan for cutting…'}
            disabled={loading}
            className="flex-1 bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none px-1" />
          <button onClick={generate} disabled={loading || !prompt.trim()}
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40 hover:opacity-90">
            {loading ? '…' : 'Generate'}
          </button>
        </div>

        {error && <div className="text-[10.5px] text-[var(--red)] px-1">{error}</div>}

        <div>
          {tab === 'Meals' && (
            <ul className="space-y-1.5">
              {plan.meals.map(m => {
                const c = SLOT_COLORS[m.slot] || SLOT_COLORS.Lunch;
                const isOpen = openMeal === m.id;
                return (
                  <li key={m.id} className="rounded-md border border-[var(--line)] hover:border-[var(--line-hi)] transition-colors">
                    <button onClick={() => setOpenMeal(isOpen ? null : m.id)}
                      className="w-full flex items-start gap-2.5 p-2 text-left">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium tracking-tight shrink-0 mt-0.5"
                        style={{ color: c.fg, background: c.bg }}>{m.slot}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-[var(--t1)] leading-tight">{m.name}</div>
                        <div className="text-[10.5px] text-[var(--t3)] tnum mt-0.5">{m.kcal} kcal · {m.protein}g protein · {m.ingredients.length} items</div>
                      </div>
                      <svg width="10" height="10" viewBox="0 0 10 10" className={`text-[var(--t3)] shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1">Ingredients</div>
                          <ul className="space-y-0.5">
                            {m.ingredients.map((ing, i) => (
                              <li key={i} className="text-[11px] text-[var(--t2)] flex justify-between gap-2">
                                <span className="truncate">{ing.name}</span>
                                <span className="text-[var(--t3)] tnum shrink-0">{ing.qty}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1">Steps</div>
                          <ol className="space-y-1">
                            {m.steps.map((s, i) => (
                              <li key={i} className="text-[11px] text-[var(--t2)] leading-snug flex gap-1.5">
                                <span className="text-[var(--t4)] tnum">{i+1}.</span><span>{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'Ingredients' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Shopping list</div>
                <div className="text-[10.5px] text-[var(--t3)] tnum">{checked.size}/{ingredients.length} grabbed</div>
              </div>
              <ul className="space-y-0.5">
                {ingredients.map((ing, i) => {
                  const id = ing.name;
                  const isChecked = checked.has(id);
                  return (
                    <li key={i}
                      onClick={() => setChecked(s => {
                        const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n;
                      })}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[var(--bg-card-hi)]/50 cursor-pointer">
                      <span className="w-3.5 h-3.5 rounded-[3px] border border-[var(--t3)] grid place-items-center shrink-0"
                        style={isChecked ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
                        {isChecked && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>}
                      </span>
                      <span className={`text-[11.5px] flex-1 truncate ${isChecked ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>{ing.name}</span>
                      <span className="text-[10.5px] text-[var(--t3)] tnum">{ing.qty}</span>
                      {ing.count > 1 && <span className="text-[9.5px] text-[var(--t4)] tnum">×{ing.count}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === 'Steps' && (
            <div className="space-y-3">
              {plan.meals.map(m => {
                const c = SLOT_COLORS[m.slot] || SLOT_COLORS.Lunch;
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium" style={{ color: c.fg, background: c.bg }}>{m.slot}</span>
                      <span className="text-[12px] text-[var(--t1)] font-medium">{m.name}</span>
                    </div>
                    <ol className="space-y-1 pl-1">
                      {m.steps.map((s, i) => (
                        <li key={i} className="text-[11px] text-[var(--t2)] leading-snug flex gap-1.5">
                          <span className="text-[var(--t4)] tnum shrink-0">{i+1}.</span><span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-[10px] text-[var(--t4)] tnum flex items-center gap-1.5 pt-1 border-t border-[var(--line)]/60">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>
          <span>Generated by Claude · {plan.generatedAt}</span>
          <span className="truncate text-[var(--t4)]">— "{plan.prompt}"</span>
        </div>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// Cross-section helpers (KPI + Calendar sync)
// ────────────────────────────────────────────────────────────────

// Hook: read routine + log from localStorage and re-render whenever they change
// (within this tab — uses a storage event + a custom event we dispatch on save).
function useWorkoutToday() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('storage', handler);
    window.addEventListener('pos:routine-changed', handler);
    window.addEventListener('pos:log-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('pos:routine-changed', handler);
      window.removeEventListener('pos:log-changed', handler);
    };
  }, []);
  const routine = React.useMemo(loadRoutine, [tick]);
  const log = React.useMemo(loadLog, [tick]);
  const di = dayIndex();
  const idx = ((di % routine.workouts.length) + routine.workouts.length) % routine.workouts.length;
  const workout = routine.workouts[idx];
  const doneToday = !!log.entries[todayKey()]?.confirmed;
  const streak = log.streak || 0;
  return { workout, idx, doneToday, streak, total: routine.workouts.length, kind: KIND_FROM_NAME(workout?.name || '') };
}

// Derive a week of workout events from the routine, placed at the user's gym slot
// (default 17:30-18:30 weekdays, 08:00-09:00 weekends — runs go to morning).
function workoutsToEvents(routine, weekStartDi) {
  if (!routine?.workouts?.length) return [];
  const out = [];
  for (let day = 0; day < 7; day++) {
    const di = weekStartDi + day;
    const idx = ((di % routine.workouts.length) + routine.workouts.length) % routine.workouts.length;
    const w = routine.workouts[idx];
    if (!w) continue;
    const isRun = /run|cardio/i.test(w.name);
    const isRest = /rest/i.test(w.name);
    if (isRest) continue;
    const isWeekend = day >= 5;
    const start = isRun || isWeekend ? 8.0 : 17.5;
    const end   = isRun || isWeekend ? 9.0 : 18.5;
    out.push({
      id: `wk-${day}-${idx}`,
      day, start, end,
      title: w.name,
      kind: isRun ? 'workout-run' : 'workout',
      loc: isRun ? 'Fire Trail' : 'RSF',
      _derived: true,
    });
  }
  return out;
}

// Memoized hook: returns the merged event list (base events + workouts).
// Re-derives when the routine changes.
function useMergedCalendarEvents(baseEvents) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener('storage', h);
    window.addEventListener('pos:routine-changed', h);
    return () => {
      window.removeEventListener('storage', h);
      window.removeEventListener('pos:routine-changed', h);
    };
  }, []);
  return React.useMemo(() => {
    const routine = loadRoutine();
    // weekStartDi: today is column 1 in the calendar (Mon=0 etc); use today's di as
    // anchor and let the week display naturally
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // back to Monday
    const wStart = dayIndex(monday);
    const wk = workoutsToEvents(routine, wStart);
    // Filter base events: drop the seed "Gym" / "5K long run" so we don't double up
    const filteredBase = baseEvents.filter(e => !/^(gym|5k long run)$/i.test(e.title));
    return [...filteredBase, ...wk];
  }, [baseEvents, tick]);
}

// Back-compat alias
const Physique = PhysicalActivity;

Object.assign(window, {
  PhysicalActivity, Physique, MealPlan,
  useWorkoutToday, useMergedCalendarEvents, workoutsToEvents,
});
