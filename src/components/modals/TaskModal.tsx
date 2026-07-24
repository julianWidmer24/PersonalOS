import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { ModalShell } from '../shared/ModalShell';

export function TaskModal() {
  const { modal, setModal, addTask, projects } = useDashboard();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [tag, setTag] = useState('course');
  const [status, setStatus] = useState('now');
  const [due, setDue] = useState('Today');
  const [projectId, setProjectId] = useState('');

  if (modal?.kind !== 'task') return null;

  const close = () => setModal(null);
  const save = () => {
    if (title.trim()) {
      addTask({ title, priority, tag: tag as 'course' | 'career' | 'personal' | 'health', status: status as 'now' | 'next' | 'later' | 'done', due, est: '—', projectId: projectId || null });
      setTitle('');
      close();
    }
  };

  return (
    <ModalShell onClose={close}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">New task</div>
            <h2 className="text-[18px] font-medium tracking-tight text-[var(--t1)]">What needs doing?</h2>
          </div>
          <button onClick={close} className="text-[var(--t3)] hover:text-[var(--t1)] w-7 h-7 rounded-md grid place-items-center hover:bg-[var(--bg-card)]">×</button>
        </div>
        <input
          autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Task title…"
          className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-3 py-2 text-[14px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none"
        />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Priority</div>
            <div className="flex gap-1">
              {(['P0', 'P1', 'P2'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 text-[11px] tnum rounded-md border ${priority === p ? 'border-[var(--t2)] bg-[var(--bg-card-hi)]' : 'border-[var(--line)] text-[var(--t3)]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Tag</div>
            <select value={tag} onChange={e => setTag(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {['course', 'career', 'personal', 'health'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Status</div>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {['now', 'next', 'later', 'done'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Due</div>
            <input value={due} onChange={e => setDue(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none" />
          </div>
          <div className="col-span-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Project (optional)</div>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              <option value="">— No project —</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={close} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Add task</button>
        </div>
      </div>
    </ModalShell>
  );
}
