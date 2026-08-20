import { useMemo, useState } from 'react';
import { useAcademics } from '../hooks/useAcademics';
import { evaluateRequirements, planStats } from '../lib/academics';
import { PlanBoard } from '../components/academics/PlanBoard';
import { RequirementsPanel } from '../components/academics/RequirementsPanel';
import { TranscriptPanel } from '../components/academics/TranscriptPanel';
import { Tabs } from '../components/shared/Tabs';

const VIEWS = ['Plan', 'Requirements', 'Record'] as const;

export function AcademicsPage() {
  const a = useAcademics();
  const [view, setView] = useState<string>('Plan');

  const plan = a.activePlan;
  const progress = useMemo(() => evaluateRequirements(plan), [plan]);

  // Cheap enough to run for all three — the badge on each tab is the whole
  // point of having three plans side by side.
  const perPlan = useMemo(
    () => a.data.plans.map(p => ({ plan: p, stats: planStats(p) })),
    [a.data.plans],
  );

  return (
    <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-5 md:py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-[15px] font-medium tracking-tight text-[var(--t1)]">Academics</h1>
          <p className="text-[11px] text-[var(--t3)]">
            Data Science BA · Econ / Business emphasis · third year
          </p>
        </div>
        <Tabs tabs={[...VIEWS]} value={view} onChange={setView} size="md" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {perPlan.map(({ plan: p, stats }) => {
          const active = p.id === plan.id;
          return (
            <button
              key={p.id}
              onClick={() => a.setActivePlanId(p.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors min-w-[160px] ${
                active
                  ? 'border-[var(--line-hi)] bg-[var(--bg-card-hi)]'
                  : 'border-[var(--line)] bg-[var(--bg-card)] hover:border-[var(--line-hi)]'
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[12.5px] tracking-tight ${active ? 'text-[var(--t1)]' : 'text-[var(--t2)]'}`}>
                  {p.name}
                </span>
                <span className="text-[10.5px] text-[var(--t3)]">{p.gradTerm}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] tnum">
                <span style={{ color: stats.unmet ? 'var(--amber)' : 'var(--green)' }}>
                  {stats.unmet ? `${stats.unmet} open` : 'all requirements met'}
                </span>
                {stats.overCapTerms > 0 && (
                  <span style={{ color: 'var(--red)' }}>{stats.overCapTerms} over cap</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {view === 'Plan' && (
        <PlanBoard
          plan={plan}
          progress={progress}
          onPlanChange={patch => a.mutatePlan(plan.id, p => ({ ...p, ...patch }))}
          onSemChange={(semId, patch) => a.mutateSemester(plan.id, semId, s => ({ ...s, ...patch }))}
          onSemRemove={semId => a.removeSemester(plan.id, semId)}
          onSemAdd={() => a.addSemester(plan.id)}
          onCourseAdd={semId => a.addCourse(plan.id, semId)}
          onCourseChange={(semId, cid, patch) => a.updateCourse(plan.id, semId, cid, patch)}
          onCourseRemove={(semId, cid) => a.removeCourse(plan.id, semId, cid)}
          onCourseMove={(semId, cid, to) => a.moveCourse(plan.id, semId, cid, to)}
          onReset={() => a.resetPlan(plan.id)}
        />
      )}

      {view === 'Requirements' && <RequirementsPanel progress={progress} />}

      {view === 'Record' && <TranscriptPanel />}
    </main>
  );
}
