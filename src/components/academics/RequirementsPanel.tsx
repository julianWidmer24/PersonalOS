import type { ReqProgress } from '../../lib/academics';
import { SATISFIED_REQS, APR_DATE } from '../../data/academicsSeed';

const n = (v: number) => (Math.round(v * 100) / 100).toString();

function Row({ p }: { p: ReqProgress }) {
  const { req, met, pct } = p;
  const courseSide = req.needCourses > 0 && req.mode !== 'terms'
    ? `${n(p.haveCourses)} / ${req.needCourses} courses`
    : req.mode === 'terms'
      ? `${n(p.haveCourses)} / ${req.needCourses} terms`
      : '';
  const unitSide = req.needUnits > 0 && req.mode !== 'terms'
    ? `${n(p.haveUnits)} / ${n(req.needUnits)} units`
    : '';

  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-[var(--t1)] tracking-tight">
          {met && <span className="text-[var(--green)] mr-1">✓</span>}
          {req.label}
        </span>
        <span className="tnum text-[10.5px] text-[var(--t3)] shrink-0">
          {[courseSide, unitSide].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className="mt-1.5 h-[3px] rounded-full bg-[var(--bg-elev)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${Math.max(pct * 100, pct > 0 ? 3 : 0)}%`,
            background: met ? 'var(--green)' : 'var(--t2)',
          }}
        />
      </div>
      {p.filledBy.length > 0 && (
        <p className="mt-1 text-[10px] text-[var(--t3)] tnum">{p.filledBy.join(' · ')}</p>
      )}
      {req.options && (
        <p className="mt-1 text-[10px] text-[var(--t4)] leading-snug">Options: {req.options}</p>
      )}
      {req.note && (
        <p className="mt-1 text-[10px] leading-snug text-[var(--amber)]/80">{req.note}</p>
      )}
    </li>
  );
}

export function RequirementsPanel({ progress }: { progress: ReqProgress[] }) {
  const groups: { name: string; rows: ReqProgress[] }[] = [];
  for (const p of progress) {
    const g = groups.find(x => x.name === p.req.group);
    if (g) g.rows.push(p);
    else groups.push({ name: p.req.group, rows: [p] });
  }
  const open = progress.filter(p => !p.met).length;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)]">
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">
          What's left
        </h3>
        <span className="text-[11px] text-[var(--t3)] tnum">
          {open} open · APR {APR_DATE}
        </span>
      </header>
      <div className="px-5 pb-5 grid md:grid-cols-2 gap-x-8">
        {groups.map(g => (
          <div key={g.name} className="mb-4 last:mb-0 min-w-0">
            <h4 className="text-[10px] uppercase tracking-[0.12em] text-[var(--t4)] mb-1">{g.name}</h4>
            <ul className="divide-y divide-[var(--line)]">
              {g.rows.map(p => <Row key={p.req.id} p={p} />)}
            </ul>
          </div>
        ))}
        <details className="md:col-span-2 mt-1 group">
          <summary className="cursor-pointer text-[11px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors list-none">
            <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>{' '}
            Already satisfied ({SATISFIED_REQS.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {SATISFIED_REQS.map(s => (
              <li key={s} className="text-[11px] text-[var(--t3)] flex gap-1.5">
                <span className="text-[var(--green)]">✓</span>{s}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
