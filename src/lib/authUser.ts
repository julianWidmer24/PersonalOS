import { supabase } from './supabase';

// Small cached accessor for the current user's id, used by hooks that write to
// Supabase (RLS requires an explicit user_id on insert). Cached because the
// providers mount only after login, so the session is stable for the session.
let cached: string | null | undefined;

export async function getUserId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const { data } = await supabase.auth.getSession();
  cached = data.session?.user?.id ?? null;
  return cached;
}
