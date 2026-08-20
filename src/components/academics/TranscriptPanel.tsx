import { TRANSCRIPT } from '../../data/academicsSeed';
import { isUpperDiv } from '../../lib/academics';

const GRADE_COLOR = (g: string) => {
  if (/^A/.test(g)) return 'var(--green)';
  if (/^B/.test(g)) return 'var(--t2)';
  if (/^C/.test(g)) return 'var(--amber)';
  if (/^(D|F)/.test(g)) return 'var(--red)';
  if (g === 'W') return 'var(--t4)';
  return 'var(--t3)';
};

export function TranscriptPanel() {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)]">
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--t3)]">
          Coursework on record
        </h3>
        <span className="text-[11px] text-[var(--t3)] tnum">
          99.84 units · major GPA 3.265 · UD major GPA 3.50
        </span>
      </header>
      <div className="px-5 pb-5 grid md:grid-cols-2 gap-x-8">
        {TRANSCRIPT.map(term => (
          <div key={term.id} className="mb-4 min-w-0">
            <div className="flex items-baseline justify-between">
              <h4 className="text-[10px] uppercase tracking-[0.12em] text-[var(--t4)]">{term.label}</h4>
              <span className="tnum text-[10px] text-[var(--t4)]">
                {term.courses.reduce((s, c) => s + c.units, 0)}u
              </span>
            </div>
            <ul className="mt-1 divide-y divide-[var(--line)]">
              {term.courses.map(c => (
                <li key={c.code + c.title} className="flex items-baseline gap-2 py-1.5">
                  <span className="tnum text-[11.5px] text-[var(--t1)] w-[92px] shrink-0 truncate">{c.code}</span>
                  <span className="text-[11px] text-[var(--t3)] flex-1 min-w-0 truncate">
                    {c.title}
                    {isUpperDiv(c.code) && <span className="ml-1 text-[9px] text-[var(--t4)]">UD</span>}
                  </span>
                  <span className="tnum text-[10.5px] text-[var(--t3)]">{c.units}u</span>
                  <span className="tnum text-[11px] w-7 text-right" style={{ color: GRADE_COLOR(c.grade) }}>
                    {c.grade}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="px-5 pb-5 -mt-2 text-[10px] text-[var(--t4)] leading-snug">
        From the Academic Progress Report run 08/19/2026. CS 189 and CS 198 were taken P/NP; CS 70 was
        withdrawn in summer 2025 and repeated in spring 2026; CS 194 (1 unit) was failed.
      </p>
    </section>
  );
}
