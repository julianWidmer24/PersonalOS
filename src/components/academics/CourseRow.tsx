import { useState } from 'react';
import type { GradPlan, PlanSemester, PlannedCourse } from '../../types';
import { REQ_CHIP, STATUS_STYLE, TAGGABLE_REQS, isUpperDiv, semesterLabel } from '../../lib/academics';

const INPUT =
  'bg-[var(--bg-elev)] border border-[var(--line)] rounded-md px-2 py-1 text-[12px] text-[var(--t1)] ' +
  'placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--line-hi)]';

interface Props {
  plan: GradPlan;
  sem: PlanSemester;
  course: PlannedCourse;
  onChange: (patch: Partial<PlannedCourse>) => void;
  onRemove: () => void;
  onMove: (toSemId: string) => void;
}

export function CourseRow({ plan, sem, course, onChange, onRemove, onMove }: Props) {
  const [open, setOpen] = useState(!course.code);
  const st = STATUS_STYLE[course.status];
  const ud = isUpperDiv(course.code);

  const toggleReq = (id: string) => {
    onChange({
      reqs: course.reqs.includes(id) ? course.reqs.filter(r => r !== id) : [...course.reqs, id],
    });
  };

  return (
    <li className="rounded-lg border border-[var(--line)] bg-[var(--bg-card-hi)]/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-2 px-2.5 py-2 text-left group"
      >
        <span className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.fg }} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[12px] font-medium tracking-tight tnum ${course.status === 'dropped' ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>
              {course.code || 'Untitled course'}
            </span>
            {ud && <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--t4)]">UD</span>}
            {course.banked && (
              <span className="text-[9.5px] text-[var(--t4)]" title="Already counted on the APR">banked</span>
            )}
          </span>
          {course.title && (
            <span className="block text-[11px] text-[var(--t3)] truncate">{course.title}</span>
          )}
          {course.note && !open && (
            <span className="block text-[10.5px] text-[var(--t4)] mt-0.5 italic">{course.note}</span>
          )}
          {course.reqs.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1">
              {course.reqs.map(r => (
                <span
                  key={r}
                  className="px-1.5 py-[1px] rounded text-[9.5px] font-medium tracking-tight"
                  style={{ color: REQ_CHIP[r]?.fg ?? 'var(--t2)', background: 'var(--bg-elev)' }}
                >
                  {REQ_CHIP[r]?.label ?? r}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="text-[11px] tnum text-[var(--t2)] shrink-0 mt-[2px]">{course.units}u</span>
        <span className="text-[var(--t4)] group-hover:text-[var(--t2)] transition-colors shrink-0 mt-[2px]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
               style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 flex flex-col gap-2 border-t border-[var(--line)] pt-2.5">
          <div className="flex gap-1.5">
            <input
              className={`${INPUT} w-[38%] tnum`} placeholder="ECON 140" value={course.code}
              onChange={e => onChange({ code: e.target.value })}
            />
            <input
              className={`${INPUT} flex-1`} placeholder="Course title" value={course.title}
              onChange={e => onChange({ title: e.target.value })}
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <label className="flex items-center gap-1 text-[10.5px] text-[var(--t3)]">
              Units
              <input
                type="number" min={0} max={12} step={0.5} value={course.units}
                onChange={e => onChange({ units: Number(e.target.value) })}
                className={`${INPUT} w-14 tnum`}
              />
            </label>
            <select
              value={course.status}
              onChange={e => onChange({ status: e.target.value as PlannedCourse['status'] })}
              className={INPUT}
            >
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input
              className={`${INPUT} w-16`} placeholder="Grade" value={course.grade ?? ''}
              onChange={e => onChange({ grade: e.target.value })}
            />
            <select
              value={sem.id}
              onChange={e => onMove(e.target.value)}
              className={INPUT}
              title="Move to another term"
            >
              {plan.semesters.map(s => (
                <option key={s.id} value={s.id}>{semesterLabel(s)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--t4)] mb-1">Counts toward</div>
            <div className="flex flex-wrap gap-1">
              {TAGGABLE_REQS.map(id => {
                const on = course.reqs.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleReq(id)}
                    className="px-1.5 py-[3px] rounded text-[10px] font-medium border transition-colors"
                    style={{
                      color: on ? REQ_CHIP[id].fg : 'var(--t3)',
                      borderColor: on ? REQ_CHIP[id].fg : 'var(--line)',
                      background: on ? 'var(--bg-elev)' : 'transparent',
                    }}
                  >
                    {REQ_CHIP[id].label}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            className={`${INPUT} w-full`} placeholder="Note — why this course, prereqs, backup…"
            value={course.note ?? ''} onChange={e => onChange({ note: e.target.value })}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[10.5px] text-[var(--t3)]">
              <input
                type="checkbox" checked={!!course.banked}
                onChange={e => onChange({ banked: e.target.checked })}
              />
              Already counted on the APR
            </label>
            <button
              onClick={onRemove}
              className="text-[11px] text-[var(--t3)] hover:text-[var(--red)] transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
