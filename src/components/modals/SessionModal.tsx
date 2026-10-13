import { useEffect, useState } from 'react';
import type { SessionDraft, TaskSession, TaskTag } from '../../types';
import { useDashboard } from '../../context/DashboardContext';
import { ModalShell } from '../shared/ModalShell';
import { TAG_COLORS } from '../../lib/dashboardHelpers';
import { WASTE_COLOR } from '../../lib/taskSessions';
import { fmtDuration } from '../../lib/calendarLayout';
import { dateKey } from '../../lib/taskStats';

// Hand-editing a block on Calendar → Time tracked: fix a start you forgot to
// press, log an hour you did offline, or own up to an hour of scrolling.

type Kind = TaskTag | 'waste';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'course', label: 'Course' },
  { value: 'career', label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'waste', label: 'Wasted' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** `YYYY-MM-DD` + `HH:MM` in local time. */
const at = (date: string, time: string) => new Date(`${date}T${time}`);

interface SessionModalProps {
  /** The block being edited, or a draft prefilled from where the grid was clicked. */
  session: TaskSession | SessionDraft;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export function SessionModal({ session, onClose, onOpenTask }: SessionModalProps) {
  const { addSession, updateSession, removeSession, tasks } = useDashboard();
  const existing = 'id' in session ? session : null;
  const running = session.endedAt == null;
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : null;

  const [title, setTitle] = useState(session.title);
  const [kind, setKind] = useState<Kind>(session.kind === 'waste' ? 'waste' : session.tag);
  const [date, setDate] = useState(dateKey(start));
  const [from, setFrom] = useState(timeOf(start));
  const [to, setTo] = useState(end ? timeOf(end) : '');
  // A running block is measured to the moment the editor opened.
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startAt = at(date, from);
  let endAt = running ? null : at(date, to);
  // An end earlier than the start means the stint ran past midnight.
  if (endAt && endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);
  const spanMs = endAt ? endAt.getTime() - startAt.getTime() : openedAt - startAt.getTime();

  const error =
    Number.isNaN(startAt.getTime()) || (endAt && Number.isNaN(endAt.getTime())) ? 'Pick a date and times.'
    : running && startAt.getTime() > openedAt ? "A running block can't start in the future."
    : !title.trim() ? 'Give it a name.'
    : null;

  const save = () => {
    if (error) return;
    const draft: SessionDraft = {
      title: title.trim(),
      kind: kind === 'waste' ? 'waste' : 'task',
      tag: kind === 'waste' ? 'personal' : kind,
      startedAt: startAt.toISOString(),
      endedAt: endAt ? endAt.toISOString() : null,
    };
    if (existing) updateSession(existing.id, draft);
    else addSession(draft);
    onClose();
  };

  const linkedTask = existing?.taskId && tasks.some(t => t.id === existing.taskId) ? existing.taskId : null;
  const input = 'w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--line)] text-[12.5px] text-[var(--t1)] tnum outline-none focus:border-[var(--line-hi)]';
  const label = 'block mb-1 text-[10.5px] uppercase tracking-[0.1em] text-[var(--t3)]';

  return (
    <ModalShell onClose={onClose}>
      <form className="p-5" onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] text-[var(--t1)] font-medium">{existing ? 'Edit tracked time' : 'Log time'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-6 h-6 rounded-md grid place-items-center text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors">✕</button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div>
            <label className={label} htmlFor="session-title">What</label>
            <input id="session-title" className={input} value={title} autoFocus
              onChange={e => setTitle(e.target.value)} placeholder="e.g. YouTube, Problem set 4" />
          </div>

          <div>
            <span className={label}>Type</span>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map(k => {
                const color = k.value === 'waste' ? WASTE_COLOR.dot : TAG_COLORS[k.value].fg;
                const on = kind === k.value;
                return (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={`px-2.5 py-1 rounded-md border text-[11.5px] transition-colors ${on ? 'text-[var(--t1)]' : 'text-[var(--t3)] border-[var(--line)] hover:text-[var(--t2)]'}`}
                    style={on ? { borderColor: color, background: `${color}22` } : undefined}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: color }} />
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={label} htmlFor="session-date">Date</label>
              <input id="session-date" type="date" className={input} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="session-from">Start</label>
              <input id="session-from" type="time" className={input} value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="session-to">End</label>
              {running ? (
                <div className="px-2.5 py-1.5 text-[12.5px] text-[var(--t3)]">running</div>
              ) : (
                <input id="session-to" type="time" className={input} value={to} onChange={e => setTo(e.target.value)} />
              )}
            </div>
          </div>

          <div className="text-[11.5px] text-[var(--t3)] tnum">
            {error ?? `${fmtDuration(Math.max(0, spanMs) / 3_600_000)}${
              endAt && dateKey(endAt) !== date ? ' · ends the next day' : ''}`}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {existing && (
            <button type="button" onClick={() => { removeSession(existing.id); onClose(); }}
              className="px-3 py-1.5 rounded-md text-[11.5px] text-[var(--red)] border border-[var(--line)] hover:border-[var(--red)] transition-colors">
              Delete
            </button>
          )}
          {linkedTask && onOpenTask && (
            <button type="button" onClick={() => { onOpenTask(linkedTask); onClose(); }}
              className="px-3 py-1.5 rounded-md text-[11.5px] text-[var(--t2)] border border-[var(--line)] hover:text-[var(--t1)] transition-colors">
              Open task
            </button>
          )}
          <button type="submit" disabled={!!error}
            className="ml-auto px-3.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--bg)] text-[11.5px] font-medium disabled:opacity-40 transition-opacity">
            {existing ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
