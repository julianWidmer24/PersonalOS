import { useState } from 'react';
import type { GradPlan, PlanSemester, PlannedCourse } from '../../types';
import { capFor, isOverCap, semesterLabel, semesterUnits } from '../../lib/academics';
import { CourseRow } from './CourseRow';

const INPUT =
  'bg-[var(--bg-elev)] border border-[var(--line)] rounded-md px-2 py-1 text-[12px] text-[var(--t1)] ' +
  'placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--line-hi)]';

const KIND_CHIP: Record<PlanSemester['kind'], { label: string; fg: string } | null> = {
  term: null,
  internship: { label: 'Internship', fg: 'var(--green)' },
  backlog: { label: 'Unscheduled', fg: 'var(--t3)' },
};

interface Props {
  plan: GradPlan;
  sem: PlanSemester;
  onSemChange: (patch: Partial<PlanSemester>) => void;
  onRemove: () => void;
  onAddCourse: () => void;
  onCourseChange: (courseId: string, patch: Partial<PlannedCourse>) => void;
  onCourseRemove: (courseId: string) => void;
  onCourseMove: (courseId: string, toSemId: string) => void;
}

export function SemesterCard({
  plan, sem, onSemChange, onRemove, onAddCourse, onCourseChange, onCourseRemove, onCourseMove,
}: Props) {
  const [editing, setEditing] = useState(false);
  const units = semesterUnits(sem);
  const cap = capFor(plan, sem);
  const over = isOverCap(plan, sem);
  const chip = KIND_CHIP[sem.kind];

  return (
    <section
      className={`flex flex-col rounded-xl border bg-[var(--bg-card)] transition-colors ${
        over ? 'border-[color:var(--red)]/40' : 'border-[var(--line)] hover:border-[var(--line-hi)]'
      }`}
    >
      <header className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[12.5px] font-medium tracking-tight text-[var(--t1)]">{semesterLabel(sem)}</h3>
            {chip && (
              <span className="px-1.5 py-[1px] rounded text-[9.5px] font-medium tracking-tight"
                    style={{ color: chip.fg, background: 'var(--bg-elev)' }}>
                {chip.label}
              </span>
            )}
          </div>
          {sem.note && <p className="text-[10.5px] text-[var(--t3)] mt-0.5 leading-snug">{sem.note}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {cap !== null && (
            <span
              className="tnum text-[11px] px-1.5 py-0.5 rounded-md border"
              style={{
                color: over ? 'var(--red)' : 'var(--t2)',
                borderColor: over ? 'color-mix(in srgb, var(--red) 40%, transparent)' : 'var(--line)',
              }}
              title={over ? `Over the ${cap}-unit cap` : `Cap ${cap} units`}
            >
              {units} / {cap}u
            </span>
          )}
          {sem.kind === 'backlog' && (
            <span className="tnum text-[11px] text-[var(--t3)]">{sem.courses.length}</span>
          )}
          {sem.kind !== 'backlog' && (
            <button
              onClick={() => setEditing(e => !e)}
              title="Edit term"
              className="w-6 h-6 rounded-md grid place-items-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2l2 2-6 6H2V8l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {editing && (
        <div className="px-3.5 pb-2 flex flex-col gap-1.5">
          <div className="flex gap-1.5 flex-wrap">
            <select
              className={INPUT} value={sem.season}
              onChange={e => onSemChange({ season: e.target.value as PlanSemester['season'] })}
            >
              {['Fall', 'Spring', 'Summer'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="number" className={`${INPUT} w-20 tnum`} value={sem.year}
              onChange={e => onSemChange({ year: Number(e.target.value) })}
            />
            <select
              className={INPUT} value={sem.kind}
              onChange={e => onSemChange({ kind: e.target.value as PlanSemester['kind'] })}
            >
              <option value="term">Class term</option>
              <option value="internship">Internship</option>
            </select>
            <label className="flex items-center gap-1 text-[10.5px] text-[var(--t3)]">
              Cap
              <input
                type="number" min={0} max={24} className={`${INPUT} w-14 tnum`}
                value={sem.unitCap ?? plan.unitCap}
                onChange={e => onSemChange({ unitCap: Number(e.target.value) })}
              />
            </label>
          </div>
          <input
            className={`${INPUT} w-full`} placeholder="Term note" value={sem.note ?? ''}
            onChange={e => onSemChange({ note: e.target.value })}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => onSemChange({ unitCap: null })}
              className="text-[10.5px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors"
            >
              Use plan cap ({plan.unitCap}u)
            </button>
            <button
              onClick={onRemove}
              className="text-[10.5px] text-[var(--t3)] hover:text-[var(--red)] transition-colors"
            >
              Delete term
            </button>
          </div>
        </div>
      )}

      <div className="px-3.5 pb-3.5">
        {sem.courses.length === 0 ? (
          <p className="text-[11px] text-[var(--t4)] py-2">
            {sem.kind === 'internship' ? 'No coursework this term.' : 'Nothing planned yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sem.courses.map(course => (
              <CourseRow
                key={course.id}
                plan={plan}
                sem={sem}
                course={course}
                onChange={patch => onCourseChange(course.id, patch)}
                onRemove={() => onCourseRemove(course.id)}
                onMove={to => onCourseMove(course.id, to)}
              />
            ))}
          </ul>
        )}
        <button
          onClick={onAddCourse}
          className="mt-2 w-full py-1.5 rounded-lg border border-dashed border-[var(--line-hi)] text-[11px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card-hi)] transition-colors"
        >
          + Add course
        </button>
      </div>
    </section>
  );
}
