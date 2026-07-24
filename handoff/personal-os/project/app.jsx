// app.jsx — DesignCanvas + DashProvider + global modal + Tweaks panel

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#f4f4f5",
  "density": "regular",
  "bgTone": "neutral",
  "fontPair": "geist",
  "showHero": true,
  "showTasks": true,
  "showHabits": true,
  "showCalendar": true,
  "showGoals": true,
  "showJournal": true,
  "showHealth": true,
  "showFinance": true,
  "showPhysique": true,
  "showMealPlan": true
}/*EDITMODE-END*/;

const BG_TONES = {
  warm:    { bg: '#0c0a09', elev: '#13110f', card: '#16130f', line: '#231f1b' },
  neutral: { bg: '#0a0a0b', elev: '#101012', card: '#131316', line: '#1f1f23' },
  cool:    { bg: '#08090c', elev: '#0d1014', card: '#10141a', line: '#1c2028' },
};
const FONT_PAIRS = {
  geist:    { sans: '"Geist", system-ui, sans-serif', mono: '"Geist Mono", ui-monospace, monospace' },
  plex:     { sans: '"IBM Plex Sans", system-ui, sans-serif', mono: '"IBM Plex Mono", ui-monospace, monospace' },
  manrope:  { sans: '"Manrope", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' },
  dmsans:   { sans: '"DM Sans", system-ui, sans-serif', mono: '"DM Mono", ui-monospace, monospace' },
};
const ACCENT_OPTIONS = ['#f4f4f5', '#a8c5ff', '#c4b5fd', '#6ee7b7', '#f5c451', '#f4a8b7'];
const FONT_HREFS = {
  plex:    'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
  manrope: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  dmsans:  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap',
};

function ensureFont(name) {
  const href = FONT_HREFS[name];
  if (!href) return;
  if (document.querySelector(`link[data-font="${name}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href; l.dataset.font = name;
  document.head.appendChild(l);
}

// ─────────────────────────────────────────────────────────────
// Global modal (task / journal)
// ─────────────────────────────────────────────────────────────
function ModalShell({ children, onClose }) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ fontFamily: '"Geist", system-ui, sans-serif' }}>
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--line-hi)] bg-[var(--bg-elev)] shadow-2xl">
        {children}
      </div>
    </div>,
    document.body
  );
}

function TaskModal() {
  const { modal, setModal, addTask, projects } = useDashboard();
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('P1');
  const [tag, setTag] = React.useState('course');
  const [status, setStatus] = React.useState('now');
  const [due, setDue] = React.useState('Today');
  const [projectId, setProjectId] = React.useState('');
  if (modal?.kind !== 'task') return null;
  const close = () => setModal(null);
  const save = () => { if (title.trim()) { addTask({ title, priority, tag, status, due, est: '—', projectId: projectId || null }); close(); } };
  return (
    <ModalShell onClose={close}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">New task</div>
            <h2 className="text-[18px] font-medium tracking-tight text-[var(--t1)]">What needs doing?</h2>
          </div>
          <button onClick={close} className="text-[var(--t3)] hover:text-[var(--t1)] w-7 h-7 rounded-md grid place-items-center hover:bg-[var(--bg-card)]">×</button>
        </div>
        <input autoFocus value={title} onChange={e=>setTitle(e.target.value)}
          onKeyDown={e=> e.key==='Enter' && save()}
          placeholder="Task title…"
          className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-3 py-2 text-[14px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Priority</div>
            <div className="flex gap-1">{['P0','P1','P2'].map(p => (
              <button key={p} onClick={()=>setPriority(p)} className={`flex-1 py-1.5 text-[11px] tnum rounded-md border ${priority===p ? 'border-[var(--t2)] bg-[var(--bg-card-hi)]' : 'border-[var(--line)] text-[var(--t3)]'}`}>{p}</button>
            ))}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Tag</div>
            <select value={tag} onChange={e=>setTag(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {['course','career','personal','health'].map(o=> <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Status</div>
            <select value={status} onChange={e=>setStatus(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {['now','next','later','done'].map(o=> <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Due</div>
            <input value={due} onChange={e=>setDue(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none" />
          </div>
          <div className="col-span-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Project (optional)</div>
            <select value={projectId} onChange={e=>setProjectId(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              <option value="">— No project —</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={close} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Add task</button>
        </div>
      </div>
    </ModalShell>
  );
}

function JournalModal() {
  const { modal, setModal, addJournal } = useDashboard();
  const [text, setText] = React.useState('');
  if (modal?.kind !== 'journal') return null;
  const close = () => setModal(null);
  const save = () => { if (text.trim()) { addJournal(text); close(); } };
  return (
    <ModalShell onClose={close}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">New entry</div>
            <h2 className="text-[18px] font-medium tracking-tight text-[var(--t1)]">{fmt.dayLabel(new Date())}</h2>
          </div>
          <button onClick={close} className="text-[var(--t3)] hover:text-[var(--t1)] w-7 h-7 rounded-md grid place-items-center hover:bg-[var(--bg-card)]">×</button>
        </div>
        <div className="text-[12px] text-[var(--t3)] mb-2 font-serif italic">“{modal.prompt}”</div>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)}
          rows={6}
          placeholder="Start writing…"
          className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-3 py-2 text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none resize-none leading-relaxed" />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={close} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Save</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Tweaks application — write CSS vars based on tweaks state
// ─────────────────────────────────────────────────────────────
function TweakApplier({ t }) {
  React.useEffect(() => {
    const r = document.documentElement;
    const tone = BG_TONES[t.bgTone] || BG_TONES.neutral;
    r.style.setProperty('--bg', tone.bg);
    r.style.setProperty('--bg-elev', tone.elev);
    r.style.setProperty('--bg-card', tone.card);
    r.style.setProperty('--bg-card-hi', tone.elev);
    r.style.setProperty('--line', tone.line);
    r.style.setProperty('--accent', t.accent);

    // density → scale CSS root font-size between artboards via custom var
    // (we just tighten card padding via a tag class)
    r.dataset.density = t.density;

    ensureFont(t.fontPair);
    const pair = FONT_PAIRS[t.fontPair] || FONT_PAIRS.geist;
    document.body.style.fontFamily = pair.sans;
    document.body.style.setProperty('--font-mono', pair.mono);
  }, [t]);
  return null;
}

// ─────────────────────────────────────────────────────────────
// Tweaks panel
// ─────────────────────────────────────────────────────────────
function TweaksUI() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <>
      <TweakApplier t={t} />
      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Background" value={t.bgTone} options={['warm','neutral','cool']}
          onChange={(v) => setTweak('bgTone', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact','regular','comfy']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSelect label="Font pairing" value={t.fontPair}
          options={['geist', 'plex', 'manrope', 'dmsans']}
          onChange={(v) => setTweak('fontPair', v)} />

        <TweakSection label="Sections" />
        <TweakToggle label="Greeting hero"  value={t.showHero}     onChange={(v)=>setTweak('showHero', v)} />
        <TweakToggle label="Task CRM"       value={t.showTasks}    onChange={(v)=>setTweak('showTasks', v)} />
        <TweakToggle label="Daily habits"   value={t.showHabits}   onChange={(v)=>setTweak('showHabits', v)} />
        <TweakToggle label="Calendar"       value={t.showCalendar} onChange={(v)=>setTweak('showCalendar', v)} />
        <TweakToggle label="Goals"          value={t.showGoals}    onChange={(v)=>setTweak('showGoals', v)} />
        <TweakToggle label="Journal"        value={t.showJournal}  onChange={(v)=>setTweak('showJournal', v)} />
        <TweakToggle label="Health"         value={t.showHealth}   onChange={(v)=>setTweak('showHealth', v)} />
        <TweakToggle label="Finance"        value={t.showFinance}  onChange={(v)=>setTweak('showFinance', v)} />
        <TweakToggle label="Meal plan"      value={t.showMealPlan} onChange={(v)=>setTweak('showMealPlan', v)} />
        <TweakToggle label="Physique"       value={t.showPhysique} onChange={(v)=>setTweak('showPhysique', v)} />
      </TweaksPanel>
    </>
  );
}

// Wrap layouts to honor section-visibility tweaks. Cheap implementation:
// re-render the entire layout but use the tweak state via a TweakContext.
const TweakCtx = React.createContext({});

function VisibilityFilter({ children }) {
  // Hooks the visible-section tweaks (read from window via the editmode bridge)
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__edit_mode_keys' && e.data.keys) setTweaks(prev => ({ ...prev, ...e.data.keys }));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return <TweakCtx.Provider value={tweaks}>{children}</TweakCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────
// Main app
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <DashProvider>
      <LayoutMissionControl />
      <TaskModal />
      <JournalModal />
      <TweaksUI />
    </DashProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
