import { createContext, useContext } from 'react';
import { usePhysical } from '../hooks/usePhysical';

type PhysicalApi = ReturnType<typeof usePhysical>;

const PhysicalCtx = createContext<PhysicalApi | null>(null);

/**
 * Holds the single usePhysical() instance for the app.
 *
 * The workout card and the Fitness calendar both read *and* write the log, and
 * they render on the same page. Two usePhysical() instances would each run
 * their own Supabase hydrate/push effects off separate React state, so a write
 * from one would be invisible to — and then overwritten by — the other.
 */
export function PhysicalProvider({ children }: { children: React.ReactNode }) {
  const api = usePhysical();
  return <PhysicalCtx.Provider value={api}>{children}</PhysicalCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePhysicalData() {
  const ctx = useContext(PhysicalCtx);
  if (!ctx) throw new Error('usePhysicalData must be used within PhysicalProvider');
  return ctx;
}
