import { useState } from 'react';
import { useDashboard, PRIORITY_COLORS } from '../context/DashboardContext';
import type { Project, Task } from '../types';
import { Card } from './shared/Card';
import { IconBtn } from './shared/IconBtn';

const PROJECT_COLOR_OPTIONS = [
  '#93c5fd', '#c4b5fd', '#6ee7b7', '#f5c451', '#f4a8b7', '#fdba74',
];

// ── Project editor ────────────────────────────────────────────
interface ProjectEditorProps {
  initial?: Partial<Project>;
  onSave: (data: Project) => void;
  onCancel: () => void;
}

function ProjectEditor({ initial, onSave, onCancel }: ProjectEditorProps) {
  const [draft, setDraft] = useState<Partial<Project>>({
    title: '', description: '', color: PROJECT_COLOR_OPTIONS[0], due: '', status: 'active',
    ...(initial || {}),
  });

  const save = () => {
    if (!draft.title?.trim()) return;
    onSave({ ...draft, due: draft.due?.trim() || '—' } as Project);
  };

  return (
    <div className="rounded-lg border border-[var(--line-hi)] bg-[var(--bg-elev)] p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--t3)]">
          {initial?.id ? 'Edit project' : 'New project'}
        </div>
        <button onClick={onCancel} className="text-[var(--t3)] hover:text-[var(--t1)] text-[11px]">close ×</button>
      </div>
      <input
        autoFocus value={draft.title || ''}
        onChange={e => setDraft({ ...draft, title: e.target.value })}
        placeholder="Project title…"
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2.5 py-1.5 text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none"
      />
      <textarea
        value={draft.description || ''}
        onChange={e => setDraft({ ...draft, description: e.target.value })}
        placeholder="What's the goal? Why does it matter? Who's involved?"
        rows={2}
        className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none resize-none leading-snug"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Target date</div>
          <input
            value={draft.due || ''} onChange={e => setDraft({ ...draft, due: e.target.value })}
            placeholder="e.g. May 30, Jun 1, Q3"
            className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Status</div>
          <select
            value={draft.status || 'active'}
            onChange={e => setDraft({ ...draft, status: e.target.value as Project['status'] })}
            className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-2 py-1.5 text-[12px] text-[var(--t1)] outline-none"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="done">done</option>
          </select>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)] mb-1">Color</div>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_COLOR_OPTIONS.map(c => (
            <button
              key={c} onClick={() => setDraft({ ...draft, color: c })}
              className="w-6 h-6 rounded-md border transition-all"
              style={{
                background: c,
                borderColor: draft.color === c ? 'var(--t1)' : 'transparent',
                outline: draft.color === c ? '2px solid var(--bg-elev)' : 'none',
                outlineOffset: -2,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
        <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">
          {initial?.id ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </div>
  );
}

// ── Project linked-task row ───────────────────────────────────
function ProjectTaskRow({ t, onToggle, onUnlink }: { t: Task; onToggle: (id: string) => void; onUnlink: (id: string) => void }) {
  const isDone = t.status === 'done';
  return (
    <li className="group flex items-center gap-2 py-1.5 border-b border-[var(--line)]/50 last:border-b-0">
      <button
        onClick={() => onToggle(t.id)}
        className="w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center shrink-0 transition-colors"
        style={isDone ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
      >
        {isDone && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="text-[10px] tnum font-mono shrink-0 w-6" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
      <div className={`text-[12.5px] flex-1 min-w-0 truncate ${isDone ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>
        {t.title}
      </div>
      <span className="text-[10.5px] text-[var(--t3)] tnum shrink-0">{t.due}</span>
      <button
        onClick={() => onUnlink(t.id)}
        className="text-[var(--t4)] hover:text-[var(--t2)] opacity-0 group-hover:opacity-100 text-[14px] leading-none w-4 h-4 grid place-items-center shrink-0"
        title="Remove from project"
      >×</button>
    </li>
  );
}

// ── Project today strip ───────────────────────────────────────
function ProjectTodayStrip({ projects, tasks, onToggleTask }: { projects: Project[]; tasks: Task[]; onToggleTask: (id: string) => void }) {
  const today = tasks
    .filter(t => t.projectId && t.status !== 'done' && /today|tomorrow/i.test(t.due))
    .sort((a, b) => {
      const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
    });
  if (today.length === 0) return null;
  const projById = Object.fromEntries(projects.map(p => [p.id, p]));
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Project work · today</div>
        <div className="text-[10.5px] text-[var(--t3)] tnum">{today.length} item{today.length === 1 ? '' : 's'}</div>
      </div>
      <ul className="space-y-0.5">
        {today.map(t => {
          const p = projById[t.projectId!];
          return (
            <li key={t.id} className="flex items-center gap-2 py-1">
              <button
                onClick={() => onToggleTask(t.id)}
                className="w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center shrink-0"
              />
              <span className="text-[10px] tnum font-mono shrink-0 w-6" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
              <span className="text-[12.5px] text-[var(--t1)] flex-1 min-w-0 truncate">{t.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium shrink-0"
                style={{ color: p?.color, background: `${p?.color}15` }}>{p?.title}</span>
              <span className="text-[10.5px] text-[var(--t3)] tnum shrink-0 w-14 text-right">{t.due}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── One project card ──────────────────────────────────────────
interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: (data: Partial<Task>) => void;
  onToggleTask: (id: string) => void;
  onUnlinkTask: (id: string) => void;
  onAssignTask: (taskId: string, projectId: string | null) => void;
  unassignedTasks: Task[];
}

function ProjectCard({ project, tasks, isOpen, onToggleOpen, onEdit, onDelete, onAddTask, onToggleTask, onUnlinkTask, onAssignTask, unassignedTasks }: ProjectCardProps) {
  const linked = tasks.filter(t => t.projectId === project.id);
  const done = linked.filter(t => t.status === 'done').length;
  const progress = linked.length ? done / linked.length : 0;
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [newDue, setNewDue] = useState('');

  const today = linked.filter(t => /today/i.test(t.due) && t.status !== 'done');
  const nextUp = linked.filter(t => t.status !== 'done').sort((a, b) => {
    const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });

  const submitNew = () => {
    if (!newTitle.trim()) return;
    onAddTask({ title: newTitle, priority: newPriority, due: newDue.trim() || '—', projectId: project.id });
    setNewTitle(''); setNewDue(''); setNewPriority('P1'); setAdding(false);
  };

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] overflow-hidden hover:border-[var(--line-hi)] transition-colors">
      <button onClick={onToggleOpen} className="w-full text-left p-3 flex items-start gap-3">
        <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: project.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14px] font-medium text-[var(--t1)] tracking-tight">{project.title}</h4>
            <span
              className="px-1.5 py-0.5 rounded text-[9.5px] font-medium uppercase tracking-wider"
              style={{
                color: project.status === 'active' ? 'var(--green)' : project.status === 'paused' ? 'var(--amber)' : 'var(--t3)',
                background: project.status === 'active' ? 'rgba(110,231,183,.10)' : project.status === 'paused' ? 'rgba(245,196,81,.10)' : 'var(--bg-card)',
              }}
            >
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-[11.5px] text-[var(--t2)] leading-snug mt-1 line-clamp-2">{project.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10.5px] text-[var(--t3)] tnum">
            <span>{done}/{linked.length} tasks</span>
            <span className="text-[var(--t4)]">·</span>
            <span>{today.length > 0 ? `${today.length} due today` : 'no tasks today'}</span>
            <span className="text-[var(--t4)]">·</span>
            <span>by {project.due}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: project.color }} />
          </div>
        </div>
        <span className="text-[var(--t3)] text-[16px] leading-none mt-0.5 shrink-0"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>›</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 border-t border-[var(--line)] pt-2.5 space-y-2.5">
          {linked.length > 0 ? (
            <ul>
              {nextUp.map(t => (
                <ProjectTaskRow key={t.id} t={t} onToggle={onToggleTask} onUnlink={onUnlinkTask} />
              ))}
              {linked.filter(t => t.status === 'done').map(t => (
                <ProjectTaskRow key={t.id} t={t} onToggle={onToggleTask} onUnlink={onUnlinkTask} />
              ))}
            </ul>
          ) : (
            <div className="text-[11px] text-[var(--t4)] italic py-2">No tasks yet. Add one to start tracking.</div>
          )}

          {adding ? (
            <div className="rounded-md border border-[var(--line)] bg-[var(--bg-card)] p-2 space-y-2">
              <input
                autoFocus value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitNew()}
                placeholder="Task title…"
                className="w-full bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex gap-1">
                  {(['P0', 'P1', 'P2'] as const).map(p => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`px-1.5 py-0.5 text-[10px] tnum font-mono rounded border ${newPriority === p ? 'border-[var(--t2)] text-[var(--t1)] bg-[var(--bg-elev)]' : 'border-[var(--line)] text-[var(--t3)]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <input value={newDue} onChange={e => setNewDue(e.target.value)}
                  placeholder="Due (e.g. Today, Fri)"
                  className="flex-1 min-w-[120px] bg-[var(--bg-elev)] border border-[var(--line)] rounded px-2 py-0.5 text-[11px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none" />
                <button onClick={submitNew} className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Add</button>
                <button onClick={() => { setAdding(false); setNewTitle(''); }} className="px-1 text-[11px] text-[var(--t3)] hover:text-[var(--t1)]">cancel</button>
              </div>
            </div>
          ) : picking ? (
            <div className="rounded-md border border-[var(--line)] bg-[var(--bg-card)] p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">Link existing task</div>
                <button onClick={() => setPicking(false)} className="text-[11px] text-[var(--t3)]">cancel</button>
              </div>
              {unassignedTasks.length === 0 ? (
                <div className="text-[11px] text-[var(--t4)] italic">All tasks are already linked.</div>
              ) : (
                <ul className="max-h-40 overflow-y-auto pos-scroll space-y-0.5">
                  {unassignedTasks.map(t => (
                    <li key={t.id}>
                      <button onClick={() => { onAssignTask(t.id, project.id); setPicking(false); }}
                        className="w-full text-left flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[var(--bg-elev)]">
                        <span className="text-[10px] tnum font-mono shrink-0 w-6" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                        <span className="text-[12px] text-[var(--t1)] flex-1 truncate">{t.title}</span>
                        <span className="text-[10px] text-[var(--t3)] tnum shrink-0">{t.due}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setAdding(true)}
                  className="px-2 py-1 rounded text-[11px] font-medium border border-[var(--line-hi)] text-[var(--t1)] hover:bg-[var(--bg-card-hi)]">
                  + New task
                </button>
                <button onClick={() => setPicking(true)}
                  className="px-2 py-1 rounded text-[11px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)]">
                  Link existing
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onEdit} className="px-2 py-1 rounded text-[11px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)]">Edit</button>
                <button onClick={onDelete} className="px-2 py-1 rounded text-[11px] text-[var(--t3)] hover:text-[var(--red)] hover:bg-[var(--bg-card-hi)]">Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Projects section ─────────────────────────────────────
export function Projects() {
  const { projects, tasks, addProject, updateProject, removeProject, addTask, toggleTask, assignTask } = useDashboard();
  const [openId, setOpenId] = useState<string | null>(projects[0]?.id || null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activeCount = projects.filter(p => p.status === 'active').length;
  const totalTasks = tasks.filter(t => t.projectId).length;
  const doneTasks = tasks.filter(t => t.projectId && t.status === 'done').length;
  const unassignedTasks = tasks.filter(t => !t.projectId && t.status !== 'done');

  const handleSave = (data: Project) => {
    if (data.id) updateProject(data.id, data);
    else addProject(data);
    setCreating(false);
    setEditingId(null);
  };

  return (
    <Card
      title="Projects"
      kicker={`${activeCount} active · ${doneTasks}/${totalTasks} task${totalTasks === 1 ? '' : 's'} done`}
      action={
        <IconBtn title="New project" onClick={() => { setCreating(true); setEditingId(null); }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </IconBtn>
      }
    >
      <div className="space-y-2.5">
        <ProjectTodayStrip projects={projects} tasks={tasks} onToggleTask={toggleTask} />

        {creating && (
          <ProjectEditor onSave={handleSave} onCancel={() => setCreating(false)} />
        )}

        <div className="space-y-2">
          {projects.map(p => editingId === p.id ? (
            <ProjectEditor key={p.id} initial={p} onSave={handleSave} onCancel={() => setEditingId(null)} />
          ) : (
            <ProjectCard
              key={p.id}
              project={p}
              tasks={tasks}
              isOpen={openId === p.id}
              onToggleOpen={() => setOpenId(openId === p.id ? null : p.id)}
              onEdit={() => { setEditingId(p.id); setOpenId(p.id); }}
              onDelete={() => { if (confirm(`Delete "${p.title}"? Tasks will be unassigned, not deleted.`)) removeProject(p.id); }}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onUnlinkTask={id => assignTask(id, null)}
              onAssignTask={assignTask}
              unassignedTasks={unassignedTasks}
            />
          ))}
        </div>

        {projects.length === 0 && !creating && (
          <div className="rounded-lg border border-dashed border-[var(--line-hi)] py-6 text-center">
            <div className="text-[12px] text-[var(--t2)]">No projects yet.</div>
            <button
              onClick={() => setCreating(true)}
              className="mt-2 px-3 py-1.5 text-[11.5px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90"
            >
              Create your first project
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
