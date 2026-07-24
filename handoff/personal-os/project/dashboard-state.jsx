// dashboard-state.jsx — placeholder data + shared hooks
// Exports to window: SEED_DATA, useDashboard, useClock, fmt, ICONS

const SEED_DATA = {
  user: { name: 'Julian', major: 'Data Science', year: 'Junior', school: 'UC Berkeley' },
  quote: 'Discipline is choosing between what you want now and what you want most.',

  // ── Projects ──────────────────────────────────────
  projects: [
    { id: 'pr1', title: 'CS189 Final Project',  description: 'Group ML project — image classification on CIFAR-10 with a custom CNN.', color: '#93c5fd', due: 'May 30', status: 'active' },
    { id: 'pr2', title: 'Summer Internship Hunt', description: 'Apply, prep, interview. Target SWE / ML roles for Summer 2026.',         color: '#c4b5fd', due: 'Jul 1',  status: 'active' },
    { id: 'pr3', title: 'Portfolio Refresh',     description: 'Rebuild personal site with new case studies before recruiting season.',    color: '#f5c451', due: 'Aug 15', status: 'active' },
  ],

  // ── Tasks (CRM-style, with pipeline status + tags + optional projectId) ──
  tasks: [
    { id: 't1', title: 'DATA C100 — Project 2: regression writeup', tag: 'course',   priority: 'P0', status: 'now',   due: 'Today 11:59pm', est: '3h',  projectId: 'pr1' },
    { id: 't2', title: 'STAT 134 problem set 9',                    tag: 'course',   priority: 'P0', status: 'now',   due: 'Tomorrow',     est: '2h',  projectId: null  },
    { id: 't3', title: 'Reply to Stripe recruiter',                  tag: 'career',   priority: 'P1', status: 'now',   due: 'Today',        est: '15m', projectId: 'pr2' },
    { id: 't4', title: 'CS189 lecture notes — kernels',              tag: 'course',   priority: 'P1', status: 'next',  due: 'Thu',          est: '1h',  projectId: 'pr1' },
    { id: 't5', title: 'Coffee chat — Anthropic PM',                 tag: 'career',   priority: 'P1', status: 'next',  due: 'Fri 2pm',      est: '30m', projectId: 'pr2' },
    { id: 't6', title: 'Refactor portfolio site',                    tag: 'personal', priority: 'P2', status: 'next',  due: 'Next week',    est: '4h',  projectId: 'pr3' },
    { id: 't7', title: 'Read “Designing Data-Intensive Apps” ch 3',  tag: 'personal', priority: 'P2', status: 'later', due: '—',            est: '2h',  projectId: null  },
    { id: 't8', title: 'File FAFSA renewal',                         tag: 'personal', priority: 'P1', status: 'later', due: 'Jun 1',        est: '45m', projectId: null  },
    { id: 't9', title: 'Submit Kaggle competition entry',            tag: 'career',   priority: 'P2', status: 'later', due: 'May 31',       est: '6h',  projectId: 'pr2' },
    { id: 't10',title: 'CS189 hw5 — submitted',                      tag: 'course',   priority: 'P1', status: 'done',  due: 'Mon',          est: '—',   projectId: 'pr1' },
    { id: 't11',title: 'Renew Clipper card',                         tag: 'personal', priority: 'P2', status: 'done',  due: '—',            est: '—',   projectId: null  },
    { id: 't12',title: 'Write copy for projects page',               tag: 'personal', priority: 'P2', status: 'next',  due: 'Jun 5',        est: '2h',  projectId: 'pr3' },
    { id: 't13',title: 'Behavioral interview prep — STAR stories',    tag: 'career',   priority: 'P1', status: 'now',   due: 'Today',        est: '1h',  projectId: 'pr2' },
  ],

  // ── Habits (daily, with 14-day history bit-string for streaks) ─
  habits: [
    { id: 'h1', name: 'Wake by 7:00am',     icon: '☀',  hist: '11101111111110', streak: 12, done: true  },
    { id: 'h2', name: 'Workout 45m',        icon: '◍',  hist: '11011110111111', streak: 6,  done: true  },
    { id: 'h3', name: 'Read 30m',           icon: '▤',  hist: '11111111110111', streak: 4,  done: true  },
    { id: 'h4', name: 'No social before noon', icon: '◴', hist: '10111101111110', streak: 3, done: false },
    { id: 'h5', name: 'Code 1 hour (side)', icon: '◇',  hist: '11110111101111', streak: 9,  done: false },
    { id: 'h6', name: 'Hydrate 3L',         icon: '◐',  hist: '11111110111111', streak: 22, done: true  },
    { id: 'h7', name: 'Journal',            icon: '✎',  hist: '11101110111111', streak: 5,  done: false },
  ],

  // ── Calendar events (multi-view) ─────────────────────────────
  // Time stored as decimal hours (24h). Days 0=Mon…6=Sun for current week
  events: [
    { id: 'e1', title: 'CS 189 — Machine Learning',   day: 0, start: 9.0,  end: 10.5, kind: 'class',   loc: 'Pimentel 1' },
    { id: 'e2', title: 'DATA C100 lab',               day: 0, start: 14.0, end: 16.0, kind: 'class',   loc: 'Dwinelle 105' },
    { id: 'e3', title: 'Gym',                         day: 0, start: 17.5, end: 18.5, kind: 'personal',loc: 'RSF' },
    { id: 'e4', title: 'Office hours — STAT 134',     day: 1, start: 11.0, end: 12.0, kind: 'work',    loc: 'Evans 332' },
    { id: 'e5', title: 'CS 189',                      day: 1, start: 9.0,  end: 10.5, kind: 'class',   loc: 'Pimentel 1' },
    { id: 'e6', title: 'Lunch w/ Maya',               day: 1, start: 12.5, end: 13.5, kind: 'personal',loc: 'Crossroads' },
    { id: 'e7', title: 'Stripe recruiter call',       day: 1, start: 15.0, end: 15.5, kind: 'career',  loc: 'Zoom' },
    { id: 'e8', title: 'CS 189',                      day: 2, start: 9.0,  end: 10.5, kind: 'class',   loc: 'Pimentel 1' },
    { id: 'e9', title: 'STAT 134 discussion',         day: 2, start: 13.0, end: 14.0, kind: 'class',   loc: 'Cory 285' },
    { id: 'e10',title: 'Data Science Society',        day: 2, start: 19.0, end: 20.0, kind: 'personal',loc: 'Soda 405' },
    { id: 'e11',title: 'CS 189 midterm review',       day: 3, start: 18.0, end: 20.0, kind: 'class',   loc: 'Wheeler 150' },
    { id: 'e12',title: 'DATA C100',                   day: 3, start: 11.0, end: 12.5, kind: 'class',   loc: 'Wheeler Aud.' },
    { id: 'e13',title: 'Coffee — Anthropic PM',       day: 4, start: 14.0, end: 14.75,kind: 'career',  loc: 'Strada' },
    { id: 'e14',title: '5K long run',                 day: 5, start: 8.0,  end: 9.0,  kind: 'personal',loc: 'Fire Trail' },
    { id: 'e15',title: 'Project deep work',           day: 5, start: 10.0, end: 13.0, kind: 'work',    loc: 'Moffitt 4' },
    { id: 'e16',title: 'Family call',                 day: 6, start: 17.0, end: 18.0, kind: 'personal',loc: 'Home' },
  ],

  // ── Goals (long-running, with progress) ──────────────────────
  goals: [
    { id: 'g1', title: 'GPA ≥ 3.9 this semester',     progress: 0.78, target: 'May 16',  cadence: 'semester', metric: '3.84 / 3.90', kind: 'academic' },
    { id: 'g2', title: 'Land Summer 2026 SWE intern', progress: 0.55, target: 'Jul 1',   cadence: 'season',   metric: '8 apps · 3 onsites', kind: 'career' },
    { id: 'g3', title: 'Run 5K under 22:00',          progress: 0.62, target: 'Sep 30',  cadence: 'season',   metric: '23:14 PR',  kind: 'health' },
    { id: 'g4', title: 'Read 24 books in 2026',       progress: 0.45, target: 'Dec 31',  cadence: 'year',     metric: '11 / 24',   kind: 'personal' },
    { id: 'g5', title: 'Save $5,000',                 progress: 0.66, target: 'Dec 31',  cadence: 'year',     metric: '$3,310 / $5,000', kind: 'finance' },
  ],

  // ── Journal ──────────────────────────────────────────────────
  journalPrompts: [
    'What is one thing I learned today that surprised me?',
    'Where did I lose focus, and what triggered it?',
    'If today were a footnote in my year, what would it say?',
    'What did I avoid, and what was I really afraid of?',
  ],
  journalEntries: [
    { id: 'j1', date: 'May 19', mood: 'focused',  excerpt: 'CS189 finally clicked — kernel trick is just a similarity function. Wrote a clean implementation before bed.' },
    { id: 'j2', date: 'May 18', mood: 'tired',    excerpt: 'Studied 6 hrs straight, diminishing returns after 4. Need to time-box harder.' },
    { id: 'j3', date: 'May 17', mood: 'grateful', excerpt: 'Maya called out of the blue. Reminded me people > deliverables.' },
    { id: 'j4', date: 'May 16', mood: 'restless', excerpt: 'Three rejections in one inbox refresh. Going to log off and run instead of doom-scroll.' },
  ],

  // ── Health / Nutrition ────────────────────────────────────────
  health: {
    sleep: { hours: 7.3, target: 8, trend: [6.8, 7.2, 6.5, 7.9, 7.1, 6.9, 7.3] },
    steps: { count: 8420, target: 10000 },
    calories: { eaten: 1840, target: 2400, p: 142, c: 198, f: 58 }, // grams
    weight:  { kg: 71.2, trend: [72.1, 71.9, 71.7, 71.6, 71.5, 71.3, 71.2] },
    workouts: { thisWeek: 4, target: 5 },
  },

  // ── Finance Pulse ─────────────────────────────────────────────
  finance: {
    netWorth: 8412.55,
    monthSpend: 1284.20,
    monthBudget: 1600,
    savingsRate: 0.31,
    cashFlow: [ // 7-day net
      { d: 'Mon', v: -42 }, { d: 'Tue', v: 18 }, { d: 'Wed', v: -88 },
      { d: 'Thu', v: -36 }, { d: 'Fri', v: 420 }, { d: 'Sat', v: -64 }, { d: 'Sun', v: -22 },
    ],
    categories: [
      { name: 'Food',      spent: 384, of: 450, color: 'var(--amber)' },
      { name: 'Transport', spent: 92,  of: 120, color: 'var(--blue)'  },
      { name: 'Books',     spent: 168, of: 200, color: 'var(--purple)'},
      { name: 'Social',    spent: 215, of: 250, color: 'var(--green)' },
      { name: 'Misc',      spent: 425, of: 580, color: 'var(--t2)'    },
    ],
    transactions: [
      { id: 'x1', merchant: 'Blue Bottle',  cat: 'Food',      amt: -6.25,  when: '9:42a' },
      { id: 'x2', merchant: 'BART',         cat: 'Transport', amt: -4.40,  when: '8:18a' },
      { id: 'x3', merchant: 'Side gig — payout', cat: 'Income', amt: 420.00, when: 'Yesterday' },
      { id: 'x4', merchant: 'Trader Joe’s', cat: 'Food',      amt: -38.71, when: 'Yesterday' },
      { id: 'x5', merchant: 'Amazon — textbook', cat: 'Books', amt: -42.18, when: '2d' },
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Master dashboard state — mutable everywhere from a single source so all
// three layout artboards share state (toggling a habit in one updates the
// other two, which makes the "this is the same app" reading obvious).
const DashCtx = React.createContext(null);

function DashProvider({ children }) {
  const [tasks, setTasks] = React.useState(SEED_DATA.tasks);
  const [habits, setHabits] = React.useState(SEED_DATA.habits);
  const [journal, setJournal] = React.useState(SEED_DATA.journalEntries);
  const [projects, setProjects] = React.useState(SEED_DATA.projects);
  const [modal, setModal] = React.useState(null); // { kind: 'task'|'journal'|'project', ... }

  const api = {
    tasks, setTasks,
    habits, setHabits,
    journal, setJournal,
    projects, setProjects,
    modal, setModal,

    toggleTask: (id) => setTasks(ts => ts.map(t => t.id === id
      ? { ...t, status: t.status === 'done' ? 'now' : 'done' } : t)),
    toggleHabit: (id) => setHabits(hs => hs.map(h => h.id === id
      ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h)),
    reorderTasks: (next) => setTasks(next),
    addTask: (data) => setTasks(ts => [{ id: 't' + Math.random().toString(36).slice(2,6),
      status: 'now', priority: 'P1', tag: 'personal', est: '—', due: 'Today', projectId: null, ...data }, ...ts]),
    updateTask: (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t)),
    removeTask: (id) => setTasks(ts => ts.filter(t => t.id !== id)),
    addJournal: (text) => setJournal(js => [{ id: 'j' + Math.random().toString(36).slice(2,6),
      date: 'Today', mood: 'focused', excerpt: text }, ...js]),

    // Projects
    addProject: (data) => setProjects(ps => [{
      id: 'pr' + Math.random().toString(36).slice(2,6),
      title: 'Untitled project', description: '', color: '#93c5fd', due: '—', status: 'active',
      ...data,
    }, ...ps]),
    updateProject: (id, patch) => setProjects(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)),
    removeProject: (id) => {
      setProjects(ps => ps.filter(p => p.id !== id));
      setTasks(ts => ts.map(t => t.projectId === id ? { ...t, projectId: null } : t));
    },
    assignTask: (taskId, projectId) => setTasks(ts => ts.map(t => t.id === taskId ? { ...t, projectId } : t)),
  };
  return <DashCtx.Provider value={api}>{children}</DashCtx.Provider>;
}

const useDashboard = () => React.useContext(DashCtx);

// ──────────────────────────────────────────────────────────────
// Format helpers
// ──────────────────────────────────────────────────────────────
const fmt = {
  money: (n) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  moneyShort: (n) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 }),
  pct: (x) => Math.round(x * 100) + '%',
  timeHM: (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
  greeting: (d) => {
    const h = d.getHours();
    if (h < 5)  return 'Late night,';
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    if (h < 21) return 'Good evening,';
    return 'Late night,';
  },
  dayLabel: (d) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
};

// Tag → muted color token
const TAG_COLORS = {
  course:   { fg: '#a8c5ff', bg: 'rgba(147,197,253,.10)' },
  career:   { fg: '#c4b5fd', bg: 'rgba(196,181,253,.10)' },
  personal: { fg: '#fcd34d', bg: 'rgba(252,211,77,.10)'  },
  health:   { fg: '#6ee7b7', bg: 'rgba(110,231,183,.10)' },
};
const PRIORITY_COLORS = {
  P0: 'var(--red)',
  P1: 'var(--amber)',
  P2: 'var(--t3)',
};

Object.assign(window, { SEED_DATA, useClock, DashProvider, useDashboard, fmt, TAG_COLORS, PRIORITY_COLORS });
