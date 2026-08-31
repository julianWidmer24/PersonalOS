import { useState, useMemo } from 'react';
import { KIND_FROM_NAME, todayKey, resolveDay } from '../hooks/usePhysical';
import { usePhysicalData } from '../context/PhysicalContext';
import { Card } from './shared/Card';
import { IconBtn } from './shared/IconBtn';
import { WorkoutDayEditor } from './WorkoutDayEditor';
import { PhotoLightbox } from './shared/PhotoLightbox';
import { buildWorkoutGallery } from '../lib/workoutPhotos';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface DayCell {
  d: Date;
  key: string;
  name: string;
  done: boolean;
  photo: string | null;
  exercises: string[];
  custom: boolean;
  idx: number;
  isToday: boolean;
  isFuture: boolean;
}

export function WorkoutCalendar() {
  const { routine, log, setLog } = usePhysicalData();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);

  // Same carousel the workout card opens — the full photo history, oldest first.
  const gallery = useMemo(() => buildWorkoutGallery(routine, log), [routine, log]);
  const openPhoto = (key: string) => {
    const i = gallery.indexByKey.get(key);
    if (i !== undefined) setLightboxAt(i);
  };

  const now = new Date();
  const todayK = todayKey(now);
  const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const leadBlanks = (anchor.getDay() + 6) % 7; // grid starts on Monday

  const cells: DayCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), i + 1);
    const key = todayKey(d);
    const r = resolveDay(routine, log, d);
    return {
      d, key,
      name: r.name,
      done: !!r.entry?.confirmed,
      photo: r.entry?.photo ?? null,
      exercises: r.exercises,
      custom: r.custom,
      idx: r.idx,
      isToday: key === todayK,
      isFuture: key > todayK,
    };
  });

  const doneCount = cells.filter(c => c.done).length;
  const elapsed = cells.filter(c => !c.isFuture).length;
  const photoCount = cells.filter(c => c.photo).length;
  const selected = selectedKey ? cells.find(c => c.key === selectedKey) ?? null : null;
  // Past days stay read-only; today and anything ahead of it can be planned.
  const editable = !!selected && selected.key >= todayK;

  const monthLabel = anchor.toLocaleDateString([], { month: 'long', year: 'numeric' });

  const goMonth = (delta: number) => {
    setMonthOffset(o => o + delta);
    setSelectedKey(null);
    setEditing(false);
  };

  const selectDay = (key: string) => {
    setSelectedKey(k => (k === key ? null : key));
    setEditing(false);
  };

  const saveDay = (name: string, exercises: string[]) => {
    if (!selected) return;
    const key = selected.key;
    const idx = selected.idx;
    setLog(l => ({
      ...l,
      entries: {
        ...l.entries,
        [key]: { ...(l.entries[key] ?? { confirmed: false, photo: null, idx }), name, exercises },
      },
    }));
    setEditing(false);
  };

  const resetDay = () => {
    if (!selected) return;
    const key = selected.key;
    setLog(l => {
      const cur = l.entries[key];
      if (!cur) return l;
      const entries = { ...l.entries };
      if (cur.confirmed || cur.photo) {
        const { name: _n, exercises: _e, ...rest } = cur;
        void _n; void _e;
        entries[key] = rest;
      } else {
        delete entries[key];
      }
      return { ...l, entries };
    });
    setEditing(false);
  };

  return (
    <Card
      title="Workout calendar"
      kicker={elapsed
        ? `${doneCount}/${elapsed} days · ${log.streak || 0}-day streak`
        : `${daysInMonth} days planned`}
      action={
        <div className="flex items-center gap-1">
          <IconBtn title="Previous month" onClick={() => goMonth(-1)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
          <span className="text-[11px] text-[var(--t2)] min-w-[92px] text-center">{monthLabel}</span>
          <IconBtn title="Next month" onClick={() => goMonth(1)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-[9px] uppercase tracking-wider text-[var(--t4)] text-center pb-0.5">{w}</div>
          ))}

          {Array.from({ length: leadBlanks }, (_, i) => <div key={`b${i}`} />)}

          {cells.map(c => {
            const k = KIND_FROM_NAME(c.name);
            const isSelected = c.key === selectedKey;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => selectDay(c.key)}
                title={`${c.d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${c.name}${
                  c.done ? ' · done' : c.isFuture ? ' · planned' : ''
                }`}
                className={`relative aspect-square rounded-md border overflow-hidden transition-colors ${
                  isSelected
                    ? 'border-[var(--accent)]'
                    : c.isToday
                      ? 'border-[var(--line-hi)]'
                      : 'border-[var(--line)] hover:border-[var(--line-hi)]'
                } ${c.isFuture ? 'opacity-60' : ''}`}
                style={c.done ? { background: k.bg } : undefined}
              >
                {c.photo && (
                  <img src={c.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative h-full flex flex-col items-center justify-center gap-0.5">
                  <span className={`text-[10px] tnum leading-none ${c.isToday ? 'text-[var(--t1)] font-medium' : 'text-[var(--t3)]'}`}>
                    {c.d.getDate()}
                  </span>
                  {/* past+today: ✓ or a dot · future: the planned workout's icon */}
                  <span className="text-[10px] leading-none" style={{ color: c.done ? k.fg : c.isFuture ? k.fg : 'var(--t4)' }}>
                    {c.done ? '✓' : c.isFuture ? k.icon : '·'}
                  </span>
                </div>
                {c.photo && (
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-[var(--accent)]" />
                )}
                {c.custom && (
                  <span className="absolute bottom-0.5 left-0.5 w-1 h-1 rounded-full bg-[var(--t3)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[var(--t4)] flex-wrap">
          <span>✓ completed</span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[var(--accent)]" /> photo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[var(--t3)]" /> edited
          </span>
          {photoCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                const first = cells.find(c => c.photo);
                if (first) openPhoto(first.key);
              }}
              className="ml-auto tnum hover:text-[var(--accent)] transition-colors"
              title="Open the photo carousel"
            >
              {photoCount} photo{photoCount === 1 ? '' : 's'} this month ↗
            </button>
          ) : (
            <span className="ml-auto tnum">no photos this month</span>
          )}
        </div>

        {selected && (
          <div className="rounded-lg border border-[var(--line-hi)] bg-[var(--bg-elev)] p-3 flex gap-3">
            {selected.photo ? (
              <button
                type="button"
                onClick={() => openPhoto(selected.key)}
                title="Expand photo"
                aria-label={`Expand the progress photo from ${selected.key}`}
                className="relative w-24 h-32 rounded-md overflow-hidden border border-[var(--line)] hover:border-[var(--accent)] shrink-0 group transition-colors"
              >
                <img
                  src={selected.photo}
                  alt={`Progress photo from ${selected.key}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                    <path d="M6.5 2H2v4.5M9.5 14H14V9.5M2 9.5V14h4.5M14 6.5V2H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            ) : (
              <div className="w-24 h-32 rounded-md border border-dashed border-[var(--line-hi)] grid place-items-center text-[9.5px] text-[var(--t4)] text-center px-2 shrink-0">
                no photo
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
                    {selected.d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[14px] font-medium text-[var(--t1)] leading-tight truncate">
                      {selected.name}
                    </span>
                    {selected.custom && (
                      <span className="px-1 py-0.5 rounded text-[9px] uppercase tracking-wider text-[var(--t3)] border border-[var(--line)] shrink-0">
                        edited
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                  style={selected.done
                    ? { color: '#6ee7b7', background: 'rgba(110,231,183,.12)' }
                    : { color: 'var(--t3)', background: 'var(--bg-card)' }}
                >
                  {selected.done ? '✓ done' : selected.isFuture ? 'planned' : selected.isToday ? 'not yet' : 'missed'}
                </span>
              </div>
              {selected.exercises.length > 0 && (
                <ul className="flex flex-wrap gap-1 mt-2">
                  {selected.exercises.map((ex, i) => (
                    <li key={i} className="px-1.5 py-0.5 rounded text-[10px] text-[var(--t2)] bg-[var(--bg-card)] border border-[var(--line)]">{ex}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-2 flex items-center gap-2">
                <span className="text-[10px] text-[var(--t4)] flex-1">
                  {editable
                    ? selected.isToday ? 'Today · log it from the workout card' : 'Upcoming · plan it here'
                    : 'Past day · view only'}
                </span>
                {editable && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-2 py-1 rounded-md text-[11px] border border-[var(--line-hi)] text-[var(--t2)] hover:text-[var(--t1)]"
                  >
                    Edit workout
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {selected && editable && editing && (
          <WorkoutDayEditor
            name={selected.name}
            exercises={selected.exercises}
            custom={selected.custom}
            onSave={saveDay}
            onReset={resetDay}
            onClose={() => setEditing(false)}
          />
        )}
      </div>

      {lightboxAt !== null && gallery.photos.length > 0 && (
        <PhotoLightbox
          photos={gallery.photos}
          index={Math.min(lightboxAt, gallery.photos.length - 1)}
          onIndexChange={setLightboxAt}
          onClose={() => setLightboxAt(null)}
        />
      )}
    </Card>
  );
}
