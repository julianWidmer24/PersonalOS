import { useState, useMemo, useEffect } from 'react';
import { SEED_MEAL_PLAN } from '../data/seed';
import { supabase } from '../lib/supabase';
import type { MealPlanData, Meal } from '../types';
import { Card } from './shared/Card';
import { Tabs } from './shared/Tabs';

const MEALPLAN_KEY = 'pos:mealplan:v2';

function loadMealPlan(): MealPlanData {
  try {
    const v = JSON.parse(localStorage.getItem(MEALPLAN_KEY) || 'null');
    if (v && v.meals) return v;
  } catch {}
  return SEED_MEAL_PLAN;
}

function aggregateIngredients(meals: MealPlanData['meals']) {
  const map = new Map<string, { name: string; qty: string; count: number }>();
  meals.forEach(m =>
    m.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase();
      if (!map.has(key)) map.set(key, { name: ing.name, qty: ing.qty, count: 1 });
      else {
        const e = map.get(key)!;
        e.count += 1;
        e.qty = e.qty + ' + ' + ing.qty;
      }
    })
  );
  return Array.from(map.values());
}

const SLOT_COLORS: Record<string, { fg: string; bg: string }> = {
  Breakfast: { fg: '#f5c451', bg: 'rgba(245,196,81,.10)'  },
  Lunch:     { fg: '#6ee7b7', bg: 'rgba(110,231,183,.10)' },
  Snack:     { fg: '#93c5fd', bg: 'rgba(147,197,253,.10)' },
  Dinner:    { fg: '#c4b5fd', bg: 'rgba(196,181,253,.10)' },
};

export function MealPlan() {
  const [plan, setPlan] = useState<MealPlanData>(loadMealPlan);
  const [tab, setTab] = useState('Meals');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [checked, setChecked] = useState(new Set<string>());

  useEffect(() => {
    try { localStorage.setItem(MEALPLAN_KEY, JSON.stringify(plan)); } catch {}
  }, [plan]);

  const generate = async () => {
    const q = prompt.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('classify', {
        body: { type: 'meal_plan', text: q },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Generation failed');
      const result = data.result as Partial<MealPlanData>;
      if (!Array.isArray(result?.meals) || result.meals.length === 0) {
        throw new Error('Claude returned an unexpected plan format — try again.');
      }
      const meals: Meal[] = result.meals.map((m, i) => ({
        id:          m.id || `m${i}`,
        slot:        (['Breakfast', 'Lunch', 'Snack', 'Dinner'].includes(m.slot) ? m.slot : 'Lunch') as Meal['slot'],
        name:        m.name ?? 'Meal',
        kcal:        Math.round(m.kcal ?? 0),
        protein:     Math.round(m.protein ?? 0),
        ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
        steps:       Array.isArray(m.steps) ? m.steps : [],
      }));
      setPlan({
        prompt:      q,
        generatedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        totals: {
          kcal:    Math.round(result.totals?.kcal    ?? meals.reduce((s, m) => s + m.kcal, 0)),
          protein: Math.round(result.totals?.protein ?? meals.reduce((s, m) => s + m.protein, 0)),
          carbs:   Math.round(result.totals?.carbs   ?? 0),
          fat:     Math.round(result.totals?.fat     ?? 0),
        },
        meals,
      });
      setPrompt('');
      setOpenMeal(null);
      setChecked(new Set());
    } catch (e) {
      setError((e as Error).message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const ingredients = useMemo(() => aggregateIngredients(plan.meals), [plan]);

  return (
    <Card
      title="Meal plan"
      kicker={`${plan.meals.length} meals · ${plan.totals.kcal} kcal · ${plan.totals.protein}g P`}
      action={<Tabs tabs={['Meals', 'Ingredients', 'Steps']} value={tab} onChange={setTab} />}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-stretch gap-1.5 p-1 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
          <div className="grid place-items-center pl-2 text-[var(--t3)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill="currentColor" />
            </svg>
          </div>
          <input
            value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder={loading ? 'Generating…' : 'Ask Claude: high-protein vegan for cutting…'}
            disabled={loading}
            className="flex-1 bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none px-1"
          />
          <button onClick={generate} disabled={loading || !prompt.trim()}
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40 hover:opacity-90">
            {loading ? '…' : 'Generate'}
          </button>
        </div>

        {error && <div className="text-[10.5px] text-[var(--red)] px-1">{error}</div>}

        <div>
          {plan.meals.length === 0 && (
            <div className="text-[11.5px] text-[var(--t4)] py-3 text-center">
              No plan yet — describe what you want above and let Claude generate one.
            </div>
          )}

          {tab === 'Meals' && (
            <ul className="space-y-1.5">
              {plan.meals.map(m => {
                const c = SLOT_COLORS[m.slot] || SLOT_COLORS.Lunch;
                const isOpen = openMeal === m.id;
                return (
                  <li key={m.id} className="rounded-md border border-[var(--line)] hover:border-[var(--line-hi)] transition-colors">
                    <button onClick={() => setOpenMeal(isOpen ? null : m.id)}
                      className="w-full flex items-start gap-2.5 p-2 text-left">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium tracking-tight shrink-0 mt-0.5"
                        style={{ color: c.fg, background: c.bg }}>{m.slot}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-[var(--t1)] leading-tight">{m.name}</div>
                        <div className="text-[10.5px] text-[var(--t3)] tnum mt-0.5">
                          {m.kcal} kcal · {m.protein}g protein · {m.ingredients.length} items
                        </div>
                      </div>
                      <svg width="10" height="10" viewBox="0 0 10 10"
                        className={`text-[var(--t3)] shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1">Ingredients</div>
                          <ul className="space-y-0.5">
                            {m.ingredients.map((ing, i) => (
                              <li key={i} className="text-[11px] text-[var(--t2)] flex justify-between gap-2">
                                <span className="truncate">{ing.name}</span>
                                <span className="text-[var(--t3)] tnum shrink-0">{ing.qty}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--t3)] mb-1">Steps</div>
                          <ol className="space-y-1">
                            {m.steps.map((s, i) => (
                              <li key={i} className="text-[11px] text-[var(--t2)] leading-snug flex gap-1.5">
                                <span className="text-[var(--t4)] tnum">{i + 1}.</span><span>{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'Ingredients' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">Shopping list</div>
                <div className="text-[10.5px] text-[var(--t3)] tnum">{checked.size}/{ingredients.length} grabbed</div>
              </div>
              <ul className="space-y-0.5">
                {ingredients.map((ing, i) => {
                  const id = ing.name;
                  const isChecked = checked.has(id);
                  return (
                    <li key={i}
                      onClick={() => setChecked(s => {
                        const n = new Set(s);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[var(--bg-card-hi)]/50 cursor-pointer"
                    >
                      <span className="w-3.5 h-3.5 rounded-[3px] border border-[var(--t3)] grid place-items-center shrink-0"
                        style={isChecked ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
                        {isChecked && (
                          <svg width="9" height="9" viewBox="0 0 9 9">
                            <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="#0a0a0b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[11.5px] flex-1 truncate ${isChecked ? 'line-through text-[var(--t3)]' : 'text-[var(--t1)]'}`}>{ing.name}</span>
                      <span className="text-[10.5px] text-[var(--t3)] tnum">{ing.qty}</span>
                      {ing.count > 1 && <span className="text-[9.5px] text-[var(--t4)] tnum">×{ing.count}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === 'Steps' && (
            <div className="space-y-3">
              {plan.meals.map(m => {
                const c = SLOT_COLORS[m.slot] || SLOT_COLORS.Lunch;
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium" style={{ color: c.fg, background: c.bg }}>{m.slot}</span>
                      <span className="text-[12px] text-[var(--t1)] font-medium">{m.name}</span>
                    </div>
                    <ol className="space-y-1 pl-1">
                      {m.steps.map((s, i) => (
                        <li key={i} className="text-[11px] text-[var(--t2)] leading-snug flex gap-1.5">
                          <span className="text-[var(--t4)] tnum shrink-0">{i + 1}.</span><span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {plan.generatedAt && (
          <div className="text-[10px] text-[var(--t4)] tnum flex items-center gap-1.5 pt-1 border-t border-[var(--line)]/60">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
            </svg>
            <span>Generated by Claude · {plan.generatedAt}</span>
            <span className="truncate text-[var(--t4)]">— "{plan.prompt}"</span>
          </div>
        )}
      </div>
    </Card>
  );
}
