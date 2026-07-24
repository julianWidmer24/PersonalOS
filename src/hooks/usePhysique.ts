import { useState, useEffect, useRef } from 'react';
import type { PhysiqueEntry } from '../types';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUser';

const PHYSIQUE_KEY = 'pos:physique:v2';

function loadPhysique(): PhysiqueEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(PHYSIQUE_KEY) || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch { /* ignore */ }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPhysique(r: any): PhysiqueEntry {
  return { id: r.id, week: r.week, label: r.label, date: r.entry_date ?? 'Today', dataUrl: r.photo ?? null };
}

// Offline-first: localStorage is the synchronous cache (unchanged behavior),
// with Supabase (table `physique_entries`, migration 006) as the cross-device
// backing store. If the table isn't there yet — or there's no session — the
// remote calls silently no-op and the app runs purely on localStorage.
export function usePhysique(): [PhysiqueEntry[], React.Dispatch<React.SetStateAction<PhysiqueEntry[]>>] {
  const [entries, setEntries] = useState<PhysiqueEntry[]>(loadPhysique);
  const syncedRef = useRef<PhysiqueEntry[]>(entries); // last state known to match remote
  const remoteReadyRef = useRef(false);               // true once the table is confirmed reachable

  // Write-through to localStorage on every change.
  useEffect(() => {
    try { localStorage.setItem(PHYSIQUE_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
  }, [entries]);

  // Hydrate from Supabase once on mount.
  useEffect(() => {
    let cancelled = false;
    supabase.from('physique_entries').select('*').order('week', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return; // table missing / no auth → stay local
        remoteReadyRef.current = true;
        if (data.length) {
          const mapped = data.map(rowToPhysique);
          syncedRef.current = mapped;
          setEntries(mapped);
        } else {
          syncedRef.current = []; // remote empty → local additions will be pushed
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Push adds/removes to Supabase after the remote is confirmed ready.
  useEffect(() => {
    if (!remoteReadyRef.current) return;
    const prev = syncedRef.current;
    if (prev === entries) return;
    syncedRef.current = entries;
    const prevSet = new Set(prev);
    const nextSet = new Set(entries);
    const added = entries.filter(e => !prevSet.has(e));
    const removed = prev.filter(e => !nextSet.has(e));
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      for (const e of added) {
        if (e.id) continue; // already persisted
        const { data, error } = await supabase.from('physique_entries')
          .insert({ user_id: uid, week: e.week, label: e.label, photo: e.dataUrl })
          .select().single();
        if (!error && data) {
          setEntries(cur => cur.map(x => (x === e ? { ...x, id: data.id } : x)));
        }
      }
      for (const e of removed) {
        if (e.id) await supabase.from('physique_entries').delete().eq('id', e.id);
      }
    })();
  }, [entries]);

  return [entries, setEntries];
}
