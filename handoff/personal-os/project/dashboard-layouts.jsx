// dashboard-layouts.jsx — Mission Control (sole layout)
// Natural-flow responsive page: widgets size to their own content,
// scroll happens on the page, never inside individual widgets.

// ════════════════════════════════════════════════════════════════
// Shared TopBar — responsive
// ════════════════════════════════════════════════════════════════
function TopBar() {
  const { user } = SEED_DATA;
  const [open, setOpen] = React.useState(false);
  const navItems = ['Today', 'Tasks', 'Projects', 'Calendar', 'Meals', 'Goals'];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-12 px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[var(--accent)] grid place-items-center text-[var(--bg)] text-[10px] font-bold shrink-0">J</div>
            <span className="text-[13px] font-medium tracking-tight text-[var(--t1)] truncate">Personal OS</span>
            <span className="hidden md:inline text-[11px] text-[var(--t3)] tnum truncate">{user.school} · {user.major}</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-[12px]">
            {navItems.map((n, i) => (
              <button key={n} className={`px-2 py-1 rounded-md transition-colors ${i === 0 ? 'text-[var(--t1)] bg-[var(--bg-card)]' : 'text-[var(--t3)] hover:text-[var(--t1)]'}`}>{n}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--line)] text-[11px] text-[var(--t3)]">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M11 11L8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <span>Quick find</span>
            <kbd className="ml-2 px-1 rounded bg-[var(--bg-card)] border border-[var(--line)] tnum text-[10px]">⌘K</kbd>
          </div>
          <button onClick={() => setOpen(o => !o)}
            className="md:hidden w-8 h-8 rounded-md border border-[var(--line)] text-[var(--t2)] grid place-items-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {open ? (
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              ) : (
                <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              )}
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#93c5fd] text-[11px] grid place-items-center text-[var(--bg)] font-medium shrink-0">JM</div>
        </div>
      </div>
      {/* Mobile nav drawer */}
      {open && (
        <nav className="md:hidden border-t border-[var(--line)] bg-[var(--bg-elev)] px-4 py-2 flex flex-wrap gap-1">
          {navItems.map((n, i) => (
            <button key={n} onClick={() => setOpen(false)}
              className={`px-2.5 py-1 text-[12px] rounded-md ${i === 0 ? 'text-[var(--t1)] bg-[var(--bg-card)]' : 'text-[var(--t3)]'}`}>{n}</button>
          ))}
        </nav>
      )}
    </header>
  );
}

// ════════════════════════════════════════════════════════════════
// KPI strip — horizontal-scroll-friendly on mobile
// ════════════════════════════════════════════════════════════════
function KPIStripResponsive() {
  return (
    <div className="-mx-1 sm:mx-0 overflow-x-auto pos-scroll">
      <div className="min-w-[640px] sm:min-w-0 px-1 sm:px-0">
        <KPIStrip />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Mission Control — single responsive page
// ════════════════════════════════════════════════════════════════
function LayoutMissionControl() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--t1)]" data-screen-label="Mission Control">
      <TopBar />
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 md:py-6">

        {/* Greeting + meta */}
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-6 mb-4 md:mb-5">
          <HeroGreeting variant="lg" user={SEED_DATA.user} />
          <div className="lg:text-right">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--t3)]">Berkeley · Spring 2026</div>
            <div className="mt-2 flex items-baseline gap-3 lg:justify-end flex-wrap">
              <span className="text-[11px] text-[var(--t3)]">Week 14 of 16</span>
              <span className="w-px h-3 bg-[var(--line-hi)]"></span>
              <span className="text-[11px] text-[var(--t3)]">23 days until finals</span>
            </div>
          </div>
        </section>

        {/* KPI strip */}
        <section className="mb-4 md:mb-5">
          <KPIStripResponsive />
        </section>

        {/* Masonry grid — widgets size to their own content, packed in 1–3 narrow columns.
            Using CSS columns gives true masonry: each widget flows into the shortest column,
            so nothing overlaps and the columns stay balanced. */}
        <div className="pos-masonry">
          <div className="pos-masonry-item"><Projects /></div>
          <div className="pos-masonry-item"><TaskCRM /></div>
          <div className="pos-masonry-item"><Calendar /></div>
          <div className="pos-masonry-item"><Habits /></div>
          <div className="pos-masonry-item"><Goals /></div>
          <div className="pos-masonry-item"><PhysicalActivity /></div>
          <div className="pos-masonry-item"><MealPlan /></div>
          <div className="pos-masonry-item"><Health /></div>
          <div className="pos-masonry-item"><Finance /></div>
          <div className="pos-masonry-item"><Journal /></div>
        </div>

        <footer className="mt-8 pb-4 text-center text-[10.5px] text-[var(--t4)] tnum">
          Personal OS · Mission Control
        </footer>
      </main>
    </div>
  );
}

Object.assign(window, { LayoutMissionControl, TopBar });
