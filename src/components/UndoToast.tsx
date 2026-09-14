import { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { UNDO_KEY, REDO_KEY } from '../lib/dashboardHelpers';

const TOAST_MS = 6000;

/** Text fields keep their own native undo; the app's history stays out of them. */
function isEditable(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Wires ⌘/Ctrl+Z to undo and ⌘/Ctrl+Y (or ⌘/Ctrl+Shift+Z) to redo, and briefly
 * announces each action with a button to reverse it.
 */
export function UndoToast() {
  const { undo, redo, undoLabel, redoLabel, lastHistoryEvent } = useDashboard();
  // The toast shows the latest event until it times out or is dismissed.
  const [hiddenSeq, setHiddenSeq] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  useEffect(() => {
    if (!lastHistoryEvent) return;
    const { seq } = lastHistoryEvent;
    const id = setTimeout(() => setHiddenSeq(seq), TOAST_MS);
    return () => clearTimeout(id);
  }, [lastHistoryEvent]);

  if (!lastHistoryEvent || hiddenSeq === lastHistoryEvent.seq) return null;

  const { kind, label, seq } = lastHistoryEvent;
  const message = kind === 'undid' ? `Undid: ${label}` : kind === 'redid' ? `Redid: ${label}` : label;
  // After an undo the natural next step is taking it back; otherwise, undoing.
  const offerRedo = kind === 'undid' && !!redoLabel;
  const offerUndo = !offerRedo && !!undoLabel;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-3 pl-3.5 pr-1.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg-card)] shadow-xl"
    >
      <span className="text-[12px] text-[var(--t2)] truncate">{message}</span>
      {(offerUndo || offerRedo) && (
        <button
          onClick={offerRedo ? redo : undo}
          className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] font-medium text-[var(--accent)] hover:bg-[var(--bg-elev)] transition-colors"
        >
          {offerRedo ? 'Redo' : 'Undo'}
          <kbd className="hidden md:inline px-1 rounded border border-[var(--line)] text-[9.5px] text-[var(--t3)] tnum font-normal">
            {offerRedo ? REDO_KEY : UNDO_KEY}
          </kbd>
        </button>
      )}
      <button
        onClick={() => setHiddenSeq(seq)}
        aria-label="Dismiss"
        className="shrink-0 w-6 h-6 grid place-items-center rounded-md text-[var(--t3)] hover:text-[var(--t1)]"
      >
        ×
      </button>
    </div>
  );
}
