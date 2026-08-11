import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Today',    to: '/'          },
  { label: 'Tasks',    to: '/tasks'     },
  { label: 'Projects', to: '/projects'  },
  { label: 'Brain',    to: '/brain'     },
  { label: 'Calendar', to: '/calendar'  },
  { label: 'Fitness',  to: '/fitness'   },
  { label: 'Goals',    to: '/goals'     },
  { label: 'Settings', to: '/settings'  },
] as const;

export function TopBar() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-12 px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[var(--accent)] grid place-items-center text-[var(--bg)] text-[10px] font-bold shrink-0">J</div>
            <span className="text-[13px] font-medium tracking-tight text-[var(--t1)] truncate">Personal OS</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-[12px]">
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-2 py-1 rounded-md transition-colors ${isActive ? 'text-[var(--t1)] bg-[var(--bg-card)]' : 'text-[var(--t3)] hover:text-[var(--t1)]'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--line)] text-[11px] text-[var(--t3)]">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M11 11L8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>Quick find</span>
            <kbd className="ml-2 px-1 rounded bg-[var(--bg-card)] border border-[var(--line)] tnum text-[10px]">⌘K</kbd>
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden w-8 h-8 rounded-md border border-[var(--line)] text-[var(--t2)] grid place-items-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {open ? (
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#93c5fd] text-[11px] grid place-items-center text-[var(--bg)] font-medium shrink-0"
            >
              JM
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-9 w-44 rounded-xl border border-[var(--line)] bg-[var(--bg-card)] shadow-xl z-50 py-1">
                <button
                  onClick={() => { setProfileOpen(false); signOut(); }}
                  className="w-full text-left px-3 py-2 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--bg-elev)] transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-[var(--line)] bg-[var(--bg-elev)] px-4 py-2 flex flex-wrap gap-1">
          {NAV_ITEMS.map(({ label, to }) => (
            <NavLink
              key={label}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-2.5 py-1 text-[12px] rounded-md ${isActive ? 'text-[var(--t1)] bg-[var(--bg-card)]' : 'text-[var(--t3)]'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
