import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import type { Task } from '../../types';
import { ModalShell } from '../shared/ModalShell';

const TAGS = ['course', 'career', 'personal', 'health'] as const;
const STATUSES = ['now', 'next', 'later', 'done'] as const;

// A due date is stored as a plain YYYY-MM-DD; older rows carry free text like
// 'Today', which the date input can't represent — show those as empty.
const asDateValue = (due?: string) => (due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '');

function TaskForm({ task }: { task: Task | null }) {
  const { setModal, addTask, updateTask, removeTask, projects } = useDashboard();
  const [title, setTitle] = useState(task?.title ?? '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'P1');
  const [tag, setTag] = useState<Task['tag']>(task?.tag ?? 'course');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'now');
  const [due, setDue] = useState(asDateValue(task?.due));
  const [projectId, setProjectId] = useState(task?.projectId ?? '');

  const close = () => setModal(null);
  const save = () => {
    if (!title.trim()) return;
    const fields = {
      title: title.trim(),
      priority,
      tag,
      status,
      due: due || '—',
      projectId: projectId || null,
    };
    if (task) updateTask(task.id, fields);
    else addTask({ ...fields, est: '—' });
    close();
  };
  const del = () => {
    if (!task) return;
    removeTask(task.id);
    close();
  };

  return (
    <ModalShell onClose={close}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">{task ? 'Edit task' : 'New task'}</div>
            <h2 className="text-[18px] font-medium tracking-tight text-[var(--t1)]">{task ? 'Update the details' : 'What needs doing?'}</h2>
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
            <select value={tag} onChange={e => setTag(e.target.value as Task['tag'])}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {TAGS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Status</div>
            <select value={status} onChange={e => setStatus(e.target.value as Task['status'])}
              className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none">
              {STATUSES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Due</div>
            <input type="date" value={due} onChange={e => setDue(e.target.value)}
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
          {task && (
            <button onClick={del} className="mr-auto px-3 py-1.5 text-[12px] text-[var(--t3)] hover:text-[var(--red,#ef4444)] rounded-md">Delete</button>
          )}
          <button onClick={close} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">
            {task ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function TaskModal() {
  const { modal, tasks } = useDashboard();
  if (modal?.kind !== 'task') return null;
  const task = modal.taskId ? tasks.find(t => t.id === modal.taskId) ?? null : null;
  // Keying on the task id gives each open a fresh form seeded from that task.
  return <TaskForm key={modal.taskId ?? 'new'} task={task} />;
}
