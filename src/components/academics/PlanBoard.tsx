import { useState } from 'react';
import type { GradPlan, PlanSemester, PlannedCourse } from '../../types';
import type { ReqProgress } from '../../lib/academics';
import { planStats } from '../../lib/academics';
import { SemesterCard } from './SemesterCard';

const INPUT =
  'bg-[var(--bg-elev)] border border-[var(--line)] rounded-md px-2 py-1 text-[12px] text-[var(--t1)] ' +
  'placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--line-hi)]';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--t4)]">{label}</span>
      <span
        className="text-[13px] tnum tracking-tight truncate"
        style={{ color: tone === 'warn' ? 'var(--red)' : tone === 'ok' ? 'var(--green)' : 'var(--t1)' }}
      >
        {value}
      </span>
    </div>
  );
}

interface Props {
  plan: GradPlan;
  progress: ReqProgress[];
  onPlanChange: (patch: Partial<GradPlan>) => void;
  onSemChange: (semId: string, patch: Partial<PlanSemester>) => void;
  onSemRemove: (semId: string) => void;
  onSemAdd: () => void;
  onCourseAdd: (semId: string) => void;
  onCourseChange: (semId: string, courseId: string, patch: Partial<PlannedCourse>) => void;
  onCourseRemove: (semId: string, courseId: string) => void;
  onCourseMove: (semId: string, courseId: string, toSemId: string) => void;
  onReset: () => void;
}

export function PlanBoard({
  plan, progress, onPlanChange, onSemChange, onSemRemove, onSemAdd,
  onCourseAdd, onCourseChange, onCourseRemove, onCourseMove, onReset,
}: Props) {
  const [editing, setEditing] = useState(false);
  const stats = planStats(plan, progress);
  const terms = plan.semesters.filter(s => s.kind !== 'backlog');
  const backlogSem = plan.semesters.find(s => s.kind === 'backlog');

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-[15px] font-medium tracking-tight text-[var(--t1)]">{plan.name}</h2>
              <span className="text-[12px] text-[var(--t2)]">graduate {plan.gradTerm}</span>
              <span className="text-[11px] text-[var(--t3)] tnum">· cap {plan.unitCap}u / term</span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--t3)] max-w-[70ch]">{plan.blurb}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(e => !e)}
              className="px-2 py-1 rounded-md border border-[var(--line)] text-[11px] text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <button
              onClick={onReset}
              title="Restore this plan to its seeded version"
              className="px-2 py-1 rounded-md border border-[var(--line)] text-[11px] text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {editing && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex gap-1.5 flex-wrap">
              <input
                className={`${INPUT} w-40`} value={plan.name} placeholder="Plan name"
                onChange={e => onPlanChange({ name: e.target.value })}
              />
              <input
                className={`${INPUT} w-36`} value={plan.gradTerm} placeholder="Spring 2028"
                onChange={e => onPlanChange({ gradTerm: e.target.value })}
              />
              <label className="flex items-center gap-1 text-[10.5px] text-[var(--t3)]">
                Unit cap
                <input
                  type="number" min={1} max={24} className={`${INPUT} w-16 tnum`} value={plan.unitCap}
                  onChange={e => onPlanChange({ unitCap: Number(e.target.value) })}
                />
              </label>
            </div>
            <textarea
              className={`${INPUT} w-full resize-y`} rows={3} value={plan.blurb}
              onChange={e => onPlanChange({ blurb: e.target.value })}
            />
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[var(--line)] grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat
            label="Units at graduation"
            value={`${Math.round(stats.totalUnits * 100) / 100} / 120`}
            tone={stats.totalUnits >= 120 ? 'ok' : 'warn'}
          />
          <Stat label="Units added" value={`${Math.round(stats.newUnits * 100) / 100}`} />
          <Stat label="Class terms" value={`${stats.teachingTerms}`} />
          <Stat
            label="Over cap"
            value={stats.overCapTerms ? `${stats.overCapTerms} term${stats.overCapTerms > 1 ? 's' : ''}` : 'none'}
            tone={stats.overCapTerms ? 'warn' : 'ok'}
          />
          <Stat
            label="Requirements open"
            value={`${stats.unmet}`}
            tone={stats.unmet ? 'warn' : 'ok'}
          />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start [&>*]:min-w-0">
        {terms.map(sem => (
          <SemesterCard
            key={sem.id}
            plan={plan}
            sem={sem}
            onSemChange={patch => onSemChange(sem.id, patch)}
            onRemove={() => onSemRemove(sem.id)}
            onAddCourse={() => onCourseAdd(sem.id)}
            onCourseChange={(cid, patch) => onCourseChange(sem.id, cid, patch)}
            onCourseRemove={cid => onCourseRemove(sem.id, cid)}
            onCourseMove={(cid, to) => onCourseMove(sem.id, cid, to)}
          />
        ))}
        <button
          onClick={onSemAdd}
          className="rounded-xl border border-dashed border-[var(--line-hi)] text-[12px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--bg-card)] transition-colors py-6"
        >
          + Add term
        </button>
      </div>

      {backlogSem && (
        <SemesterCard
          plan={plan}
          sem={backlogSem}
          onSemChange={patch => onSemChange(backlogSem.id, patch)}
          onRemove={() => onSemRemove(backlogSem.id)}
          onAddCourse={() => onCourseAdd(backlogSem.id)}
          onCourseChange={(cid, patch) => onCourseChange(backlogSem.id, cid, patch)}
          onCourseRemove={cid => onCourseRemove(backlogSem.id, cid)}
          onCourseMove={(cid, to) => onCourseMove(backlogSem.id, cid, to)}
        />
      )}
    </div>
  );
}
