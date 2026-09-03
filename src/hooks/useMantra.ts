import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUser';

export type Mantra = { text: string; author: string };

const KEY = 'pos:mantra:v1';

export const EMPTY_MANTRA: Mantra = { text: '', author: '' };

function load(): Mantra {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v.text === 'string') {
      return { text: v.text, author: typeof v.author === 'string' ? v.author : '' };
    }
  } catch { /* ignore */ }
  return EMPTY_MANTRA;
}

/**
 * The quote pinned at the top of the dashboard. Offline-first, same shape as
 * useAcademics: localStorage is the synchronous cache so the words are on
 * screen before the network answers, and `dashboard_mantra` (migration 011) is
 * the cross-device store. If that table isn't there yet the remote calls
 * no-op and the quote still saves locally.
 */
export function useMantra() {
  const [mantra, setMantra] = useState<Mantra>(load);

  const rowId = useRef<string | null>(null);
  const ready = useRef(false);
  const synced = useRef<Mantra>(mantra);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(mantra)); } catch { /* ignore */ }
  }, [mantra]);

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from('dashboard_mantra').select('*').order('updated_at', { ascending: false }).limit(1);
      if (cancelled || error || !rows) return;
      ready.current = true;
      if (rows.length && typeof rows[0].data?.text === 'string') {
        rowId.current = rows[0].id;
        const remote: Mantra = { text: rows[0].data.text, author: rows[0].data.author ?? '' };
        synced.current = remote;
        setMantra(remote);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Push changes. Saving is an explicit button press, but keep the same short
  // debounce as the other writers so a double-click can't race two inserts.
  useEffect(() => {
    if (!ready.current || mantra === synced.current) return;
    synced.current = mantra;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const uid = await getUserId();
      if (!uid) return;
      if (rowId.current) {
        await supabase.from('dashboard_mantra')
          .update({ data: mantra, updated_at: new Date().toISOString() }).eq('id', rowId.current);
      } else {
        const { data: row, error } = await supabase.from('dashboard_mantra')
          .insert({ user_id: uid, data: mantra }).select().single();
        if (!error && row) rowId.current = row.id;
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [mantra]);

  const save = useCallback((next: Mantra) => {
    setMantra({ text: next.text.trim(), author: next.author.trim() });
  }, []);

  return { mantra, save };
}
