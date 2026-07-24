import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { fmt } from '../lib/dashboardHelpers';
import { Card } from './shared/Card';

interface MealRow {
  id: string;
  logged_at: string;
  description: string;
  calories_estimate: number | null;
  protein_estimate: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  source: 'manual' | 'telegram' | 'photo';
  deleted_at: string | null;
}

const SOURCE_LABEL: Record<string, { label: string; fg: string; bg: string }> = {
  manual:   { label: 'manual',   fg: '#93c5fd', bg: 'rgba(147,197,253,.10)' },
  telegram: { label: 'telegram', fg: '#c4b5fd', bg: 'rgba(196,181,253,.10)' },
  photo:    { label: 'photo',    fg: '#6ee7b7', bg: 'rgba(110,231,183,.10)' },
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function MealLog() {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('meals')
      .select('*')
      .is('deleted_at', null)
      .gte('logged_at', startOfTodayISO())
      .order('logged_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('meals fetch error:', error); return; }
        setMeals((data ?? []) as MealRow[]);
      });

    const channel = supabase
      .channel('meals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meals' },
        (payload) => {
          const row = payload.new as MealRow;
          if (row.deleted_at || row.logged_at < startOfTodayISO()) return;
          setMeals(ms => ms.some(m => m.id === row.id) ? ms : [row, ...ms]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meals' },
        (payload) => {
          const row = payload.new as MealRow;
          setMeals(ms => row.deleted_at
            ? ms.filter(m => m.id !== row.id)
            : ms.map(m => m.id === row.id ? row : m));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meals' },
        (payload) => {
          setMeals(ms => ms.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totals = useMemo(() => meals.reduce(
    (acc, m) => ({
      kcal:    acc.kcal    + (m.calories_estimate ?? 0),
      protein: acc.protein + (m.protein_estimate ?? 0),
      carbs:   acc.carbs   + (m.carbs_grams ?? 0),
      fat:     acc.fat     + (m.fat_grams ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  ), [meals]);

  const logMeal = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);

    // Estimate macros via Claude; the meal still gets logged if this fails
    let calories: number | null = null;
    let protein: number | null = null;
    let carbs: number | null = null;
    let fat: number | null = null;
    try {
      const { data, error } = await supabase.functions.invoke('classify', {
        body: { type: 'meal', text },
      });
      if (!error && data?.ok) {
        const r = data.result ?? {};
        if (typeof r.calories === 'number') calories = Math.round(r.calories);
        if (typeof r.protein_grams === 'number') protein = Math.round(r.protein_grams);
        if (typeof r.carbs_grams === 'number') carbs = Math.round(r.carbs_grams);
        if (typeof r.fat_grams === 'number') fat = Math.round(r.fat_grams);
      }
    } catch (e) {
      console.error('meal estimate error:', e);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { error: insErr } = await supabase.from('meals').insert({
      user_id:           session?.user?.id,
      description:       text,
      calories_estimate: calories,
      protein_estimate:  protein,
      carbs_grams:       carbs,
      fat_grams:         fat,
      source:            'manual',
    });
    if (insErr) {
      console.error('meal insert error:', insErr);
      setError('Could not save meal.');
    } else {
      setDraft('');
    }
    setSaving(false);
  };

  const removeMeal = (id: string) => {
    setMeals(ms => ms.filter(m => m.id !== id));
    supabase.from('meals').update({ deleted_at: new Date().toISOString() })
      .eq('id', id).then(({ error }) => {
        if (error) console.error('meal delete error:', error);
      });
  };

  return (
    <Card
      title="Today's meals"
      kicker={`${meals.length} logged · ${totals.kcal} kcal · ${totals.protein}g P · ${totals.carbs}g C · ${totals.fat}g F`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-stretch gap-1.5 p-1 rounded-md bg-[var(--bg-elev)] border border-[var(--line)]">
          <input
            value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logMeal()}
            placeholder={saving ? 'Estimating macros…' : 'Log a meal: chicken burrito bowl, large…'}
            disabled={saving}
            className="flex-1 bg-transparent text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none px-2"
          />
          <button onClick={logMeal} disabled={saving || !draft.trim()}
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--accent)] text-[var(--bg)] disabled:opacity-40 hover:opacity-90">
            {saving ? '…' : 'Log'}
          </button>
        </div>

        {error && <div className="text-[10.5px] text-[var(--red)] px-1">{error}</div>}

        {meals.length === 0 ? (
          <div className="text-[11.5px] text-[var(--t4)] py-3 text-center">
            Nothing logged today — type above or send the Telegram bot a photo.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {meals.map(m => {
              const src = SOURCE_LABEL[m.source] ?? SOURCE_LABEL.manual;
              return (
                <li key={m.id} className="group flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-[var(--bg-card-hi)]/50">
                  <span className="text-[10.5px] tnum text-[var(--t3)] w-14 shrink-0">
                    {fmt.timeHM(new Date(m.logged_at))}
                  </span>
                  <span className="text-[12px] text-[var(--t1)] flex-1 min-w-0 truncate">{m.description}</span>
                  <span className="text-[10.5px] text-[var(--t3)] tnum shrink-0">
                    {m.calories_estimate != null ? `${m.calories_estimate} kcal` : '—'}
                    {m.protein_estimate != null ? ` · ${m.protein_estimate}g P` : ''}
                    {m.carbs_grams != null ? ` · ${m.carbs_grams}g C` : ''}
                    {m.fat_grams != null ? ` · ${m.fat_grams}g F` : ''}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0"
                    style={{ color: src.fg, background: src.bg }}>{src.label}</span>
                  <button onClick={() => removeMeal(m.id)} title="Delete"
                    className="opacity-0 group-hover:opacity-100 text-[var(--t4)] hover:text-[var(--red)] w-5 h-5 grid place-items-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
