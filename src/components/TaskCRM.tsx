import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TAG_COLORS, PRIORITY_COLORS } from '../lib/dashboardHelpers';
import type { Task, Project } from '../types';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';
import { IconBtn } from './shared/IconBtn';
import { Chip } from './shared/Chip';

function StarBtn({ starred, onStar }: { starred: boolean; onStar: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onStar(); }}
      title={starred ? 'Unstar task' : 'Star task'}
      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:scale-110"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 1l1.35 2.73 3.02.44-2.19 2.13.52 3.01L6 7.77l-2.7 1.54.52-3.01L1.63 4.17l3.02-.44L6 1z"
          fill={starred ? 'var(--amber)' : 'none'}
          stroke={starred ? 'var(--amber)' : 'currentColor'}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onDelete(); }}
      title="Delete task"
      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[var(--t3)] hover:text-[var(--red,#ef4444)] hover:scale-110"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 3h7M5 3V2.2a.7.7 0 0 1 .7-.7h.6a.7.7 0 0 1 .7.7V3M4 3l.4 6.3a.7.7 0 0 0 .7.65h1.8a.7.7 0 0 0 .7-.65L8 3"
          stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const TASK_COLUMNS = [
  { id: 'now',   label: 'Now',   hint: 'in focus'  },
  { id: 'next',  label: 'Next',  hint: 'this week' },
  { id: 'later', label: 'Later', hint: 'backlog'   },
  { id: 'done',  label: 'Done',  hint: 'archive'   },
] as const;

interface TaskRowProps {
  t: Task;
  onToggle: (id: string) => void;
  onStar?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: (id: string) => void;
  compact?: boolean;
  project?: Project | null;
}

function TaskRow({ t, onToggle, onStar, onDelete, onDragStart, onDragOver, onDrop, compact, project }: TaskRowProps) {
  const tagColor = TAG_COLORS[t.tag] || {};
  const isDone = t.status === 'done';
  return (
    <li
      draggable
      onDragStart={() => onDragStart?.(t.id)}
      onDragOver={e => { e.preventDefault(); onDragOver?.(t.id); }}
      onDrop={() => onDrop?.(t.id)}
      className={`group flex items-start gap-2.5 ${compact ? 'py-1.5' : 'py-2'} border-b border-[var(--line)]/60 last:border-b-0 hover:bg-[var(--bg-card-hi)]/50 -mx-2 px-2 rounded-md transition-colors`}
    >
      <button
        onClick={() => onToggle(t.id)}
        className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] hover:border-[var(--t1)] grid place-items-center transition-colors shrink-0"
        style={isDone ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
      >
        {isDone && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] leading-tight ${isDone ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'} break-words`}>
          {t.title}
        </div>
        {!compact && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] tnum font-mono" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
            <span className="w-px h-2.5 bg-[var(--line)]" />
            <Chip fg={tagColor.fg} bg={tagColor.bg}>{t.tag}</Chip>
            {project && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium"
                style={{ color: project.color, background: `${project.color}15` }}>
                {project.title}
              </span>
            )}
            <span className="text-[10.5px] text-[var(--t3)] truncate">{t.due}</span>
            <span className="text-[10.5px] text-[var(--t4)] tnum ml-auto">{t.est}</span>
          </div>
        )}
      </div>
      {(onStar || onDelete) && (
        <div className="mt-0.5 flex items-center gap-2">
          {onStar && <StarBtn starred={!!t.isStarred} onStar={() => onStar(t.id)} />}
          {onDelete && <DeleteBtn onDelete={() => onDelete(t.id)} />}
        </div>
      )}
    </li>
  );
}

export function TaskCRM() {
  const { tasks, projects, toggleTask, starTask, removeTask, reorderTasks, setModal } = useDashboard();
  const [dragId, setDragId] = useState<string | null>(null);
  const [view, setView] = useState('Pipeline');

  const projById = useMemo(() => Object.fromEntries((projects || []).map(p => [p.id, p])), [projects]);

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (overId: string) => {
    if (!dragId || dragId === overId) return;
    const idx = tasks.findIndex(t => t.id === dragId);
    const overIdx = tasks.findIndex(t => t.id === overId);
    const overStatus = tasks[overIdx].status;
    const moved = { ...tasks[idx], status: overStatus };
    const next = tasks.filter(t => t.id !== dragId);
    next.splice(overIdx > idx ? overIdx - 1 : overIdx, 0, moved);
    reorderTasks(next);
    setDragId(null);
  };

  const byStatus = (s: string) => tasks.filter(t => t.status === s);

  const Header = (
    <div className="flex items-center gap-1.5">
      <Tabs tabs={['Pipeline', 'List']} value={view} onChange={setView} />
      <IconBtn title="New task" onClick={() => setModal({ kind: 'task' })}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </IconBtn>
    </div>
  );

  return (
    <Card title="Task CRM" kicker={`${tasks.filter(t => t.status !== 'done').length} open`} action={Header}>
      {view === 'Pipeline' ? (
        <div className="flex flex-col gap-3">
          {TASK_COLUMNS.map(col => {
            const colTasks = byStatus(col.id);
            return (
              <section
                key={col.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (!dragId) return;
                  const moved = { ...tasks.find(t => t.id === dragId)!, status: col.id as Task['status'] };
                  reorderTasks([moved, ...tasks.filter(t => t.id !== dragId)]);
                  setDragId(null);
                }}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)]/40"
              >
                <header className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-[var(--line)]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-medium text-[var(--t1)] uppercase tracking-[0.08em]">{col.label}</span>
                    <span className="text-[10.5px] text-[var(--t3)] tnum px-1.5 py-0.5 rounded bg-[var(--bg-card)]">{colTasks.length}</span>
                    <span className="text-[10px] text-[var(--t4)]">{col.hint}</span>
                  </div>
                </header>
                <div className="p-2">
                  {colTasks.length === 0 ? (
                    <div className="text-[11px] text-[var(--t4)] italic px-2 py-2">drop tasks here</div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-1.5">
                      {colTasks.map(t => {
                        const p = t.projectId ? projById[t.projectId] : null;
                        return (
                          <li
                            key={t.id}
                            draggable
                            onDragStart={() => onDragStart(t.id)}
                            className="group p-2 rounded-md bg-[var(--bg-card)] border border-[var(--line)] hover:border-[var(--line-hi)] transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleTask(t.id)}
                                className="mt-0.5 w-3.5 h-3.5 rounded-[4px] border border-[var(--t3)] grid place-items-center shrink-0"
                                style={col.id === 'done' ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
                              >
                                {col.id === 'done' && (
                                  <svg width="9" height="9" viewBox="0 0 9 9">
                                    <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                                  </svg>
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className={`text-[12px] leading-[1.3] ${col.id === 'done' ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'} break-words`}>
                                  {t.title}
                                </div>
                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9.5px] tnum font-mono" style={{ color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                                  <Chip fg={(TAG_COLORS[t.tag] || {}).fg} bg={(TAG_COLORS[t.tag] || {}).bg}>{t.tag}</Chip>
                                  {p && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                                      style={{ color: p.color, background: `${p.color}15` }}>
                                      {p.title}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[var(--t3)] truncate">{t.due}</span>
                                  <span className="ml-auto flex items-center gap-2">
                                    <StarBtn starred={!!t.isStarred} onStar={() => starTask(t.id)} />
                                    <DeleteBtn onDelete={() => removeTask(t.id)} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-0">
          {tasks.map(t => (
            <TaskRow
              key={t.id} t={t} onToggle={toggleTask} onStar={starTask} onDelete={removeTask}
              project={t.projectId ? projById[t.projectId] : null}
              onDragStart={onDragStart} onDrop={onDrop} onDragOver={() => {}}
              compact={false}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
