// dashboard-sections.jsx — all 7 dashboard sections + shared shell
// Each section accepts a {variant} prop: 'sm' | 'md' | 'lg' | 'wide' | 'tall'
// so the three layouts can pick suitable shapes without forking components.

// ──────────────────────────────────────────────────────────────
// Shared card shell
// ──────────────────────────────────────────────────────────────
function Card({ title, action, kicker, children, className = '', noPad, dense }) {
  return (
    <section className={`relative flex flex-col rounded-xl border border-[var(--line)] bg-[var(--bg-card)] hover:border-[var(--line-hi)] transition-colors ${className}`}>
      {title && (
        <header className={`flex items-center justify-between gap-2 ${dense ? 'px-4 pt-3 pb-2' : 'px-5 pt-4 pb-3'}`}>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">{title}</h3>
            {kicker && <span className="text-[11px] text-[var(--t3)] tnum">{kicker}</span>}
          </div>
          {action && <div className="flex items-center gap-1 text-[var(--t2)] shrink-0">{action}</div>}
        </header>
      )}
      <div className={`${noPad ? '' : (dense ? 'px-4 pb-4' : 'px-5 pb-5')}`}>
        {children}
      </div>
    </section>
  );
}

function Tabs({ tabs, value, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex items-center rounded-md bg-[var(--bg-elev)] p-0.5 border border-[var(--line)]">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 ${size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-xs'} rounded-[5px] font-medium tracking-tight transition-colors ${
            value === t ? 'bg-[var(--bg-card-hi)] text-[var(--t1)] shadow-[0_0_0_1px_var(--line-hi)]' : 'text-[var(--t3)] hover:text-[var(--t2)]'
          }`}
        >{t}</button>
      ))}
    </div>
  );
}

const IconBtn = ({ children, title, onClick }) => (
  <button title={title} onClick={onClick}
    className="w-6 h-6 rounded-md grid place-items-center text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors">{children}</button>
);

const Chip = ({ children, fg, bg, dot }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium tracking-tight"
    style={{ color: fg || 'var(--t2)', background: bg || 'var(--bg-elev)' }}>
    {dot && <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />}
    {children}
  </span>
);

const KIND_COLORS = {
  class:        { dot: '#93c5fd', bar: 'rgba(147,197,253,0.7)', bg: 'rgba(147,197,253,0.08)' },
  career:       { dot: '#c4b5fd', bar: 'rgba(196,181,253,0.7)', bg: 'rgba(196,181,253,0.08)' },
  personal:     { dot: '#f5c451', bar: 'rgba(245,196,81,0.7)',  bg: 'rgba(245,196,81,0.08)'  },
  work:         { dot: '#6ee7b7', bar: 'rgba(110,231,183,0.7)', bg: 'rgba(110,231,183,0.08)' },
  workout:      { dot: '#f4a8b7', bar: 'rgba(244,168,183,0.75)',bg: 'rgba(244,168,183,0.10)' },
  'workout-run':{ dot: '#fdba74', bar: 'rgba(253,186,116,0.75)',bg: 'rgba(253,186,116,0.10)' },
};

// ──────────────────────────────────────────────────────────────
// Hero (greeting + clock + quote + ambient dot)
// ──────────────────────────────────────────────────────────────
function HeroGreeting({ variant = 'lg', user }) {
  const now = useClock();
  const greeting = fmt.greeting(now);
  const day = fmt.dayLabel(now);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const lg = variant === 'lg' || variant === 'hero';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[11px] text-[var(--t3)] uppercase tracking-[0.14em]">
        <span className="relative inline-block w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-[var(--green)] ambient-dot"></span>
        </span>
        <span>Live</span>
        <span className="text-[var(--t4)]">·</span>
        <span className="tnum">{day}</span>
        <span className="text-[var(--t4)]">·</span>
        <span className="tnum">{time}</span>
      </div>
      <h1 className={`${lg ? 'text-[44px]' : 'text-[28px]'} font-light tracking-[-0.025em] leading-[1.05] text-[var(--t1)] mt-1`}>
        <span className="text-[var(--t3)]">{greeting}</span> {user.name}.
      </h1>
      {lg && (
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--t2)] font-serif italic">
          “{SEED_DATA.quote}”
        </p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// KPI strip (used in Mission Control)
// ──────────────────────────────────────────────────────────────
function KPI({ label, value, delta, hint, accent }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="flex-1 px-5 py-4 border-r border-[var(--line)] last:border-r-0">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-medium tracking-[-0.02em] tnum" style={{ color: accent || 'var(--t1)' }}>{value}</span>
        {delta != null && (
          <span className="text-[11px] tnum" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
            {up ? '↑' : '↓'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[11px] text-[var(--t3)]">{hint}</div>}
    </div>
  );
}

function KPIStrip() {
  const { tasks, habits } = useDashboard();
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const habitDone = habits.filter(h => h.done).length;
  const workout = useWorkoutToday();
  return (
    <div className="flex rounded-xl border border-[var(--line)] bg-[var(--bg-card)] overflow-hidden">
      <KPI label="Open tasks"  value={openTasks} hint={`${tasks.filter(t=>t.priority==='P0'&&t.status!=='done').length} P0 today`} />
      <KPI label="Habits"      value={`${habitDone}/${habits.length}`} hint="today" />
      <WorkoutKPI w={workout} />
      <KPI label="GPA"         value="3.84" hint="target 3.90" />
      <KPI label="Net worth"   value={fmt.moneyShort(SEED_DATA.finance.netWorth)} delta={2.4} hint="this month" />
      <KPI label="Sleep avg"   value={`${SEED_DATA.health.sleep.hours}h`} delta={-3} hint="7-day" />
    </div>
  );
}

function WorkoutKPI({ w }) {
  return (
    <div className="flex-1 px-5 py-4 border-r border-[var(--line)] last:border-r-0">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">Workout</div>
        {w.doneToday && <span className="text-[9.5px] tnum" style={{ color: '#6ee7b7' }}>✓ done</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[20px] leading-none" style={{ color: w.kind.fg }}>{w.kind.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.01em] text-[var(--t1)] truncate leading-tight">{w.workout?.name || 'Rest'}</div>
          <div className="text-[10.5px] text-[var(--t3)] tnum">day {w.idx + 1}/{w.total} · {w.streak}-day streak</div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 1. Task CRM
// ──────────────────────────────────────────────────────────────
const TASK_COLUMNS = [
  { id: 'now',   label: 'Now',   hint: 'in focus' },
  { id: 'next',  label: 'Next',  hint: 'this week' },
  { id: 'later', label: 'Later', hint: 'backlog' },
  { id: 'done',  label: 'Done',  hint: 'archive' },
];

function TaskRow({ t, onToggle, onDragStart, onDragOver, onDrop, compact, project }) {
  const tagColor = TAG_COLORS[t.tag] || {};
  const isDone = t.status === 'done';
  return (
    <li
      draggable
      onDragStart={() => onDragStart && onDragStart(t.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver && onDragOver(t.id); }}
      onDrop={() => onDrop && onDrop(t.id)}
      className={`group flex items-start gap-2.5 ${compact ? 'py-1.5' : 'py-2'} border-b border-[var(--line)]/60 last:border-b-0 hover:bg-[var(--bg-card-hi)]/50 -mx-2 px-2 rounded-md transition-colors`}
    >
      <button onClick={() => onToggle(t.id)} className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center transition-colors shrink-0"
        style={isDone ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
        {isDone && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] leading-tight ${isDone ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'} break-words`}>{t.title}</div>
        {!compact && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] tnum font-mono" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
            <span className="w-px h-2.5 bg-[var(--line)]"></span>
            <Chip fg={tagColor.fg} bg={tagColor.bg}>{t.tag}</Chip>
            {project && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium"
                style={{ color: project.color, background: `${project.color}15` }}>{project.title}</span>
            )}
            <span className="text-[10.5px] text-[var(--t3)] truncate">{t.due}</span>
            <span className="text-[10.5px] text-[var(--t4)] tnum ml-auto">{t.est}</span>
          </div>
        )}
      </div>
    </li>
  );
}

function TaskCRM({ variant = 'lg' }) {
  const { tasks, projects, toggleTask, reorderTasks, setModal } = useDashboard();
  const [dragId, setDragId] = React.useState(null);
  const [view, setView] = React.useState('Pipeline');

  const projById = React.useMemo(() => Object.fromEntries((projects || []).map(p => [p.id, p])), [projects]);

  const onDragStart = (id) => setDragId(id);
  const onDrop = (overId) => {
    if (!dragId || dragId === overId) return;
    const idx = tasks.findIndex(t => t.id === dragId);
    const overIdx = tasks.findIndex(t => t.id === overId);
    const overStatus = tasks[overIdx].status;
    const moved = { ...tasks[idx], status: overStatus };
    const next = tasks.filter(t => t.id !== dragId);
    next.splice(overIdx > idx ? overIdx - 1 : overIdx, 0, moved);
    reorderTasks(next);
    setDragId(null);
  };

  const byStatus = (s) => tasks.filter(t => t.status === s);

  const Header = (
    <div className="flex items-center gap-1.5">
      <Tabs tabs={['Pipeline', 'List']} value={view} onChange={setView} />
      <IconBtn title="New task" onClick={() => setModal({ kind: 'task' })}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </IconBtn>
    </div>
  );

  return (
    <Card title="Task CRM" kicker={`${tasks.filter(t=>t.status!=='done').length} open`} action={Header}>
      {view === 'Pipeline' ? (
        <div className="flex flex-col gap-3">
          {TASK_COLUMNS.map(col => {
            const colTasks = byStatus(col.id);
            return (
              <section key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragId) return;
                  const moved = { ...tasks.find(t => t.id === dragId), status: col.id };
                  reorderTasks([moved, ...tasks.filter(t => t.id !== dragId)]);
                  setDragId(null);
                }}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)]/40">
                <header className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[var(--line)]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-medium text-[var(--t1)] uppercase tracking-[0.08em]">{col.label}</span>
                    <span className="text-[10.5px] text-[var(--t3)] tnum px-1.5 py-0.5 rounded bg-[var(--bg-card)]">{colTasks.length}</span>
                    <span className="text-[10px] text-[var(--t4)]">{col.hint}</span>
                  </div>
                </header>
                <div className="p-2">
                  {colTasks.length === 0 ? (
                    <div className="text-[11px] text-[var(--t4)] italic px-2 py-2">drop tasks here</div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-1.5">
                      {colTasks.map(t => {
                        const p = t.projectId ? projById[t.projectId] : null;
                        return (
                          <li key={t.id} draggable onDragStart={() => onDragStart(t.id)}
                            className="p-2 rounded-md bg-[var(--bg-card)] border border-[var(--line)] hover:border-[var(--line-hi)] transition-colors">
                            <div className="flex items-start gap-2">
                              <button onClick={() => toggleTask(t.id)} className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] grid place-items-center shrink-0"
                                style={col.id === 'done' ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
                                {col.id === 'done' && <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className={`text-[12px] leading-[1.3] ${col.id === 'done' ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'} break-words`}>{t.title}</div>
                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9.5px] tnum font-mono" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                                  <Chip fg={(TAG_COLORS[t.tag]||{}).fg} bg={(TAG_COLORS[t.tag]||{}).bg}>{t.tag}</Chip>
                                  {p && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                                      style={{ color: p.color, background: `${p.color}15` }}>{p.title}</span>
                                  )}
                                  <span className="text-[10px] text-[var(--t3)] truncate">{t.due}</span>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-0">
          {tasks.map(t => (
            <TaskRow key={t.id} t={t} onToggle={toggleTask}
              project={t.projectId ? projById[t.projectId] : null}
              onDragStart={onDragStart} onDrop={onDrop} onDragOver={() => {}}
              compact={false} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 2. Habits
// ──────────────────────────────────────────────────────────────
function HabitDots({ hist }) {
  return (
    <div className="flex items-center gap-[3px]">
      {hist.split('').map((c, i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-[1.5px]"
          style={{ background: c === '1' ? 'var(--t2)' : 'var(--line-hi)' }} />
      ))}
    </div>
  );
}

function Habits({ variant = 'md' }) {
  const { habits, toggleHabit } = useDashboard();
  const done = habits.filter(h => h.done).length;
  const compact = variant === 'sm';

  return (
    <Card title="Daily habits" kicker={`${done}/${habits.length} today`} dense={compact}
      action={
        <span className="text-[11px] text-[var(--t3)] tnum">
          <span className="text-[var(--amber)]">●</span> 22-day streak
        </span>
      }>
      <ul className="space-y-1">
        {habits.map(h => (
          <li key={h.id} className="flex items-center gap-3 py-1.5 group">
            <button onClick={() => toggleHabit(h.id)}
              className="w-5 h-5 rounded-full border grid place-items-center shrink-0 transition-all"
              style={h.done
                ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                : { borderColor: 'var(--line-hi)' }}>
              {h.done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5L4 7L8 3" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-[12.5px] ${h.done ? 'text-[var(--t2)]' : 'text-[var(--t1)]'} truncate`}>{h.name}</div>
            </div>
            {!compact && <HabitDots hist={h.hist} />}
            <span className="text-[10.5px] tnum text-[var(--t3)] w-10 text-right">{h.streak}d</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 3. Calendar (day / week / month)
// ──────────────────────────────────────────────────────────────
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarWeek({ events, todayIdx = 1, compact }) {
  const hourPx = compact ? 18 : 22;
  const startH = 8, endH = 21;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[34px_repeat(7,1fr)] text-[10.5px] text-[var(--t3)] pb-1 border-b border-[var(--line)]">
        <div />
        {DOW.map((d, i) => (
          <div key={d} className="px-1 text-center">
            <span className={`tnum ${i === todayIdx ? 'text-[var(--t1)] font-medium' : ''}`}>{d}</span>
            <span className={`block tnum ${i === todayIdx ? 'text-[var(--t1)]' : ''}`}>{19 + i}</span>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="grid grid-cols-[34px_repeat(7,1fr)] relative">
          <div>
            {hours.map(h => (
              <div key={h} style={{ height: hourPx }} className="text-[9.5px] text-[var(--t4)] pr-1 text-right tnum">
                {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="relative border-l border-[var(--line)]/60">
              {hours.map(h => <div key={h} style={{ height: hourPx }} className="border-b border-[var(--line)]/30" />)}
              {events.filter(e => e.day === day).map(e => {
                const top = (e.start - startH) * hourPx;
                const h = (e.end - e.start) * hourPx;
                const c = KIND_COLORS[e.kind] || KIND_COLORS.work;
                return (
                  <div key={e.id} className="absolute inset-x-0.5 rounded-[3px] px-1 py-0.5 overflow-hidden"
                    style={{ top, height: h, background: c.bg, borderLeft: `2px solid ${c.bar}` }}>
                    <div className="text-[9.5px] leading-tight text-[var(--t1)] truncate">{e.title}</div>
                    {h >= 26 && <div className="text-[9px] text-[var(--t3)] truncate">{e.loc}</div>}
                  </div>
                );
              })}
              {day === todayIdx && (
                <div className="absolute inset-x-0 border-t border-[var(--accent)]" style={{ top: (10.5 - startH) * hourPx }}>
                  <span className="absolute -left-1 -top-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarDay({ events }) {
  const todays = events.filter(e => e.day === 1).sort((a, b) => a.start - b.start);
  return (
    <ul className="space-y-1.5">
      {todays.map(e => {
        const c = KIND_COLORS[e.kind] || KIND_COLORS.work;
        const dur = (e.end - e.start);
        return (
          <li key={e.id} className="flex gap-3 items-start">
            <div className="text-[10.5px] tnum text-[var(--t3)] pt-0.5 w-12 shrink-0">
              {e.start >= 12 ? `${(e.start === 12 ? 12 : e.start - 12).toString().padStart(2, ' ').trim()}${e.start % 1 ? ':30' : ':00'}p`
                            : `${e.start.toString().padStart(2, ' ').trim()}${e.start % 1 ? ':30' : ':00'}a`}
            </div>
            <div className="w-px self-stretch" style={{ background: c.bar, opacity: .6 }} />
            <div className="flex-1 pb-1.5 min-w-0">
              <div className="text-[12.5px] text-[var(--t1)] leading-tight truncate">{e.title}</div>
              <div className="text-[10.5px] text-[var(--t3)] flex items-center gap-1.5">
                <span>{e.loc}</span>
                <span className="text-[var(--t4)]">·</span>
                <span className="tnum">{dur < 1 ? `${dur*60}m` : `${dur}h`}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CalendarMonth() {
  // Pseudo-month grid: 5 weeks × 7 cols, dots = event density
  const cells = Array.from({ length: 35 }, (_, i) => {
    const dn = i - 2; // offset so 1 starts on Wed
    const inMonth = dn > 0 && dn <= 31;
    const evCount = inMonth ? ((i * 7) % 5) : 0;
    return { dn, inMonth, evCount, today: dn === 19 };
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-[var(--t4)] uppercase tracking-[0.1em]">
        {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`aspect-square rounded-md p-1 border ${c.today ? 'border-[var(--accent)] bg-[var(--accent-2)]' : 'border-[var(--line)]/60'} ${c.inMonth ? '' : 'opacity-30'}`}>
            <div className={`text-[10.5px] tnum ${c.today ? 'text-[var(--t1)] font-medium' : 'text-[var(--t3)]'}`}>{c.inMonth ? c.dn : ''}</div>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: Math.min(c.evCount, 3) }, (_, k) => (
                <span key={k} className="w-1 h-1 rounded-full" style={{ background: ['#93c5fd', '#c4b5fd', '#f5c451'][k] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Calendar({ variant = 'lg' }) {
  const [view, setView] = React.useState('Week');
  const events = useMergedCalendarEvents(SEED_DATA.events);
  return (
    <Card title="Calendar" kicker="May 19 — May 25"
      action={<Tabs tabs={['Day', 'Week', 'Month']} value={view} onChange={setView} />}>
      <div>
        {view === 'Day' && <CalendarDay events={events} />}
        {view === 'Week' && <CalendarWeek events={events} todayIdx={1} compact={false} />}
        {view === 'Month' && <CalendarMonth />}
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 4. Goals
// ──────────────────────────────────────────────────────────────
function GoalRow({ g, accent }) {
  return (
    <div className="py-2.5 border-b border-[var(--line)]/60 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] text-[var(--t1)] leading-tight">{g.title}</div>
          <div className="mt-0.5 text-[10.5px] text-[var(--t3)] tnum">{g.metric} · by {g.target}</div>
        </div>
        <div className="text-[11px] tnum text-[var(--t2)] shrink-0">{fmt.pct(g.progress)}</div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-[var(--line)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${g.progress * 100}%`, background: accent || 'var(--accent)' }} />
      </div>
    </div>
  );
}

function Goals({ variant = 'md' }) {
  return (
    <Card title="Goals" kicker={`${SEED_DATA.goals.length} active`}
      action={<IconBtn title="New goal"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></IconBtn>}>
      <div>
        {SEED_DATA.goals.map(g => <GoalRow key={g.id} g={g} />)}
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 5. Journal
// ──────────────────────────────────────────────────────────────
const MOOD_COLOR = { focused: '#93c5fd', tired: '#f5c451', grateful: '#6ee7b7', restless: '#f87171' };

function Journal({ variant = 'md' }) {
  const { journal, addJournal, setModal } = useDashboard();
  const prompt = SEED_DATA.journalPrompts[new Date().getDate() % SEED_DATA.journalPrompts.length];
  const [draft, setDraft] = React.useState('');

  return (
    <Card title="Journal" kicker={`${journal.length} entries`}
      action={<IconBtn title="New entry" onClick={() => setModal({ kind: 'journal', prompt })}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </IconBtn>}>
      <div className="flex flex-col gap-3">
        <div className="p-3 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1.5">Today's prompt</div>
          <p className="text-[13px] font-serif italic leading-snug text-[var(--t1)]">{prompt}</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Start writing..."
            rows={2}
            className="mt-2 w-full bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none resize-none"
          />
          {draft.length > 0 && (
            <button onClick={() => { addJournal(draft); setDraft(''); }}
              className="mt-1 text-[11px] text-[var(--accent)] hover:underline">Save entry →</button>
          )}
        </div>
        <ul className="space-y-2">
          {journal.slice(0, 5).map(j => (
            <li key={j.id} className="flex gap-2.5">
              <span className="w-1 self-stretch rounded-full" style={{ background: MOOD_COLOR[j.mood] || 'var(--t3)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10.5px] tnum text-[var(--t3)]">{j.date}</span>
                  <span className="text-[10px] text-[var(--t4)] uppercase tracking-wider">{j.mood}</span>
                </div>
                <p className="text-[12px] text-[var(--t2)] leading-snug mt-0.5">{j.excerpt}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 6. Health / Nutrition
// ──────────────────────────────────────────────────────────────
function Sparkline({ data, w = 96, h = 28, color = 'var(--t2)', fill }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const dFill = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {fill && <path d={dFill} fill={fill} opacity=".25" />}
      <path d={d} stroke={color} strokeWidth="1.2" fill="none" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2" fill={color} />
    </svg>
  );
}

function Ring({ pct, size = 56, stroke = 4, color = 'var(--accent)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] tnum text-[var(--t1)] font-medium leading-none">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Health({ variant = 'md' }) {
  const h = SEED_DATA.health;
  const tabs = ['Today', 'Week'];
  const [tab, setTab] = React.useState('Today');
  return (
    <Card title="Health & nutrition" kicker={`${h.workouts.thisWeek}/${h.workouts.target} workouts`}
      action={<Tabs tabs={tabs} value={tab} onChange={setTab} />}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
            <Ring pct={h.sleep.hours / 12} color="var(--purple)" label={`${h.sleep.hours}h`} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Sleep</div>
              <div className="text-[10.5px] text-[var(--t2)] tnum">target {h.sleep.target}h</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
            <Ring pct={h.steps.count / h.steps.target} color="var(--green)" label={(h.steps.count/1000).toFixed(1)+'k'} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Steps</div>
              <div className="text-[10.5px] text-[var(--t2)] tnum">of {h.steps.target/1000}k</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
            <Ring pct={h.calories.eaten / h.calories.target} color="var(--amber)" label={`${(h.calories.eaten/1000).toFixed(1)}k`} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">kcal</div>
              <div className="text-[10.5px] text-[var(--t2)] tnum">of {h.calories.target}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Protein', h.calories.p, '#93c5fd'], ['Carbs', h.calories.c, '#f5c451'], ['Fat', h.calories.f, '#c4b5fd']].map(([k,v,c]) => (
            <div key={k} className="p-2 rounded-md border border-[var(--line)]/60">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">{k}</div>
              <div className="text-[14px] tnum font-medium text-[var(--t1)] mt-0.5">{v}<span className="text-[10px] text-[var(--t3)] ml-0.5">g</span></div>
              <div className="mt-1.5 h-0.5 rounded-full bg-[var(--line)] overflow-hidden">
                <div className="h-full" style={{ width: `${Math.min(100, v / 200 * 100)}%`, background: c }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 mt-1 pt-2 border-t border-[var(--line)]/60">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Weight (7d)</div>
            <div className="text-[15px] tnum font-medium text-[var(--t1)]">{h.weight.kg} <span className="text-[10px] text-[var(--t3)]">kg</span> <span className="text-[10.5px] text-[var(--green)] ml-1">−0.9</span></div>
          </div>
          <Sparkline data={h.weight.trend} color="var(--green)" w={120} h={32} />
        </div>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 7. Finance Pulse
// ──────────────────────────────────────────────────────────────
function FinanceBars({ data }) {
  const max = Math.max(...data.map(d => Math.abs(d.v)));
  return (
    <div className="flex items-end gap-1.5 h-12">
      {data.map(d => {
        const h = Math.max(2, Math.abs(d.v) / max * 40);
        const up = d.v >= 0;
        return (
          <div key={d.d} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex flex-col items-stretch justify-end h-10 w-full">
              <div className="w-full rounded-[2px]" style={{ height: h, background: up ? 'var(--green)' : 'var(--red)', opacity: up ? .8 : .6 }} />
            </div>
            <div className="text-[9.5px] text-[var(--t4)] tnum">{d.d[0]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Finance({ variant = 'md' }) {
  const f = SEED_DATA.finance;
  const pct = f.monthSpend / f.monthBudget;
  return (
    <Card title="Finance pulse" kicker={fmt.moneyShort(f.netWorth) + ' net'}
      action={<Tabs tabs={['Month', 'Week']} value={'Month'} onChange={()=>{}} />}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Spent this month</div>
            <div className="text-[24px] font-medium text-[var(--t1)] tnum tracking-[-0.02em]">{fmt.money(f.monthSpend)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Savings rate</div>
            <div className="text-[16px] font-medium text-[var(--green)] tnum">{fmt.pct(f.savingsRate)}</div>
          </div>
        </div>
        <div>
          <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full" style={{ width: `${pct * 100}%`, background: pct > 0.9 ? 'var(--red)' : pct > 0.7 ? 'var(--amber)' : 'var(--green)' }} />
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-[var(--t3)] tnum">
            <span>{fmt.pct(pct)} of {fmt.moneyShort(f.monthBudget)}</span>
            <span>{fmt.moneyShort(f.monthBudget - f.monthSpend)} left</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1.5">Net flow · 7d</div>
            <FinanceBars data={f.cashFlow} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1.5">By category</div>
            <ul className="space-y-1">
              {f.categories.slice(0, 4).map(c => (
                <li key={c.name} className="flex items-center gap-2 text-[10.5px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-[var(--t2)] flex-1 truncate">{c.name}</span>
                  <span className="text-[var(--t3)] tnum">{fmt.moneyShort(c.spent)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="space-y-1 border-t border-[var(--line)]/60 pt-2">
          {f.transactions.slice(0, 5).map(t => (
            <li key={t.id} className="flex items-center justify-between text-[11.5px] py-0.5">
              <span className="text-[var(--t1)] truncate flex-1">{t.merchant}</span>
              <span className="text-[var(--t4)] mx-2 text-[10px]">{t.cat}</span>
              <span className={`tnum w-16 text-right ${t.amt < 0 ? 'text-[var(--t2)]' : 'text-[var(--green)]'}`}>{fmt.money(t.amt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

Object.assign(window, {
  Card, Tabs, IconBtn, Chip,
  HeroGreeting, KPIStrip, KPI,
  TaskCRM, Habits, Calendar, Goals, Journal, Health, Finance,
  Sparkline, Ring,
});
