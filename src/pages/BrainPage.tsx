import { Brain } from '../components/Brain';

export function BrainPage() {
  return (
    <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--t1)]">Brain</h1>
        <p className="mt-0.5 text-[12px] text-[var(--t3)]">Your life areas, strategic context, and AI advisor in one place.</p>
      </div>
      <Brain />
    </main>
  );
}
