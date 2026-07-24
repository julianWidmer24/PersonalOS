import { useState, useEffect } from 'react';
import type { PhysiqueEntry } from '../types';

const PHYSIQUE_KEY = 'pos:physique:v2';

function loadPhysique(): PhysiqueEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(PHYSIQUE_KEY) || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  return [];
}

export function usePhysique(): [PhysiqueEntry[], React.Dispatch<React.SetStateAction<PhysiqueEntry[]>>] {
  const [entries, setEntries] = useState<PhysiqueEntry[]>(loadPhysique);
  useEffect(() => {
    try { localStorage.setItem(PHYSIQUE_KEY, JSON.stringify(entries)); } catch {}
  }, [entries]);
  return [entries, setEntries];
}
