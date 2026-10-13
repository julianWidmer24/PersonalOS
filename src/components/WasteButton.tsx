import { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { wastedTodayMs } from '../lib/taskSessions';

// The "I'm wasting time" switch. It's meant to feel like something you'd
// rather not touch: hazard-taped and red when idle, an alarm when running.
// Pressing it opens a waste stint in task_sessions, so the time lands on
// Calendar → Time tracked as a red block.

/** 1:04:09 / 4:09 — a running clock reads better than "1h 4m" here. */
function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

function fmtLost(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'nothing yet';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Ticks every second while a stint runs, every minute otherwise. */
function useNow(fast: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), fast ? 1000 : 60_000);
    return () => clearInterval(id);
  }, [fast]);
  return now;
}

const HAZARD =
  'repeating-linear-gradient(-45deg, rgba(248,113,113,0.22) 0 6px, rgba(248,113,113,0.06) 6px 12px)';

function Hourglass({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 1.5h7M3.5 12.5h7M4.5 1.5v1.8c0 1.2 2.5 2.5 2.5 3.7 0-1.2 2.5-2.5 2.5-3.7V1.5M4.5 12.5v-1.8C4.5 9.5 7 8.2 7 7c0 1.2 2.5 2.5 2.5 3.7v1.8"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The top-bar switch, on every page. */
export function WasteButton() {
  const { wasteSession, sessions, startWasting, stopWasting } = useDashboard();
  const running = !!wasteSession;
  const now = useNow(running);
  const lost = wastedTodayMs(sessions, now);

  if (running) {
    const elapsed = now - Date.parse(wasteSession.startedAt);
    return (
      <button
        onClick={stopWasting}
        title="Stop the waste timer"
        className="waste-alarm flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-md bg-red text-bg font-semibold text-ui tnum shrink-0"
      >
        <Hourglass />
        <span>{fmtClock(elapsed)}</span>
        <span className="hidden sm:inline font-medium opacity-80">· Stop</span>
      </button>
    );
  }

  return (
    <button
      onClick={startWasting}
      title={`Starts a timer of time you're wasting. Lost today: ${fmtLost(lost)}`}
      className="group flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-md border-2 border-red text-red text-ui font-semibold uppercase tracking-caps shrink-0 transition-[filter,transform] hover:brightness-125 active:scale-95"
      style={{ background: HAZARD }}
    >
      <Hourglass />
      <span className="hidden sm:inline">I'm wasting time</span>
      <span className="sm:hidden">Wasting</span>
      {lost >= 60_000 && (
        <span className="hidden lg:inline normal-case tracking-normal font-medium text-red/70 tnum">
          · {fmtLost(lost)} lost today
        </span>
      )}
    </button>
  );
}

/**
 * Full-width alarm under the top bar while a stint runs, and the timer in the
 * tab title so it's visible from the YouTube tab too.
 */
export function WasteBanner() {
  const { wasteSession, sessions, stopWasting } = useDashboard();
  const running = !!wasteSession;
  const now = useNow(running);

  const elapsed = wasteSession ? now - Date.parse(wasteSession.startedAt) : 0;
  useEffect(() => {
    if (!running) return;
    const original = document.title;
    document.title = `⏳ ${fmtClock(elapsed)} wasted`;
    return () => { document.title = original; };
  }, [running, elapsed]);

  if (!wasteSession) return null;
  const lost = wastedTodayMs(sessions, now);

  return (
    <div className="sticky top-12 z-20 border-b-2 border-red text-red" style={{ background: HAZARD }}>
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-3 flex-wrap bg-bg/70">
        <span className="waste-dot w-2.5 h-2.5 rounded-full bg-red shrink-0" />
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="text-title font-semibold uppercase tracking-caps">You're wasting time</span>
          <span className="text-xl font-semibold tnum">{fmtClock(elapsed)}</span>
          <span className="text-ui text-red/70 tnum">{fmtLost(lost)} gone today. You won't get it back.</span>
        </div>
        <button
          onClick={stopWasting}
          className="ml-auto px-3.5 py-1.5 rounded-md bg-red text-bg text-ui font-semibold hover:brightness-110 active:scale-95 transition"
        >
          Stop — back to work
        </button>
      </div>
    </div>
  );
}
