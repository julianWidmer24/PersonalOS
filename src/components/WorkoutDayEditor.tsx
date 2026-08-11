import { useState } from 'react';

interface WorkoutDayEditorProps {
  name: string;
  exercises: string[];
  /** true when this day already deviates from the routine */
  custom: boolean;
  onSave: (name: string, exercises: string[]) => void;
  /** clears the override so the day falls back to the routine's suggestion */
  onReset: () => void;
  onClose: () => void;
}

export function WorkoutDayEditor({ name, exercises, custom, onSave, onReset, onClose }: WorkoutDayEditorProps) {
  const [draftName, setDraftName] = useState(name);
  const [draftEx, setDraftEx] = useState(exercises.join(', '));

  const save = () => {
    const n = draftName.trim();
    if (!n) return;
    onSave(n, draftEx.split(',').map(s => s.trim()).filter(Boolean));
  };

  return (
    <div className="rounded-lg border border-[var(--line-hi)] bg-[var(--bg-elev)] p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">Edit this day</div>
        <button onClick={onClose} className="text-[var(--t3)] hover:text-[var(--t1)] text-[10px]">close ×</button>
      </div>
      <input
        value={draftName}
        onChange={e => setDraftName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="Workout name — e.g. Push"
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none focus:border-[var(--line-hi)]"
      />
      <textarea
        value={draftEx}
        onChange={e => setDraftEx(e.target.value)}
        placeholder="bench press, overhead press, lateral raises"
        rows={3}
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md p-2 text-[11px] font-mono text-[var(--t1)] placeholder:text-[var(--t4)] outline-none resize-none leading-relaxed focus:border-[var(--line-hi)]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--t4)]">comma-separated · this day only</span>
        <div className="flex items-center gap-1.5">
          {custom && (
            <button
              onClick={onReset}
              className="px-2 py-1 rounded-md text-[11px] border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]"
            >
              Use routine
            </button>
          )}
          <button
            onClick={save}
            disabled={!draftName.trim()}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
