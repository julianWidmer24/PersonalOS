import { NavLink } from 'react-router-dom';

const NAV = [
  {
    label: 'Today', to: '/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 3v4M13 3v4M3 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Tasks', to: '/tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Brain', to: '/brain',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4c-1.5 0-3 1-3.5 2.5-.8 0-2 .8-2 2.5 0 1.5 1 2.5 2 3v1.5h7V12c1-.5 2-1.5 2-3 0-1.7-1.2-2.5-2-2.5C13 5 11.5 4 10 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8.5 13.5v1.5a1.5 1.5 0 003 0v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Goals', to: '/goals',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Settings', to: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 3v2M10 15v2M3 10h2M15 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--line)] pb-safe">
      <div className="flex items-stretch">
        {NAV.map(({ label, to, icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--t3)]'}`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
