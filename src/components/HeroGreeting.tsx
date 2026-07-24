import { useClock, fmt } from '../lib/dashboardHelpers';

export function HeroGreeting({ variant = 'lg' }: { variant?: 'sm' | 'md' | 'lg' | 'hero' }) {
  const now = useClock();
  const greeting = fmt.greeting(now);
  const day = fmt.dayLabel(now);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const lg = variant === 'lg' || variant === 'hero';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[11px] text-[var(--t3)] uppercase tracking-[0.14em]">
        <span className="relative inline-block w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-[var(--green)] ambient-dot" />
        </span>
        <span>Live</span>
        <span className="text-[var(--t4)]">·</span>
        <span className="tnum">{day}</span>
        <span className="text-[var(--t4)]">·</span>
        <span className="tnum">{time}</span>
      </div>
      <h1
        className={`${lg ? 'text-[44px]' : 'text-[28px]'} font-light tracking-[-0.025em] leading-[1.05] text-[var(--t1)] mt-1`}
        style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
      >
        <span className="text-[var(--t3)]">{greeting}</span> Julian.
      </h1>
    </div>
  );
}
