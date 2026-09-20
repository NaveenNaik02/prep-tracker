import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { LibraryType } from '../types';

export interface SharedEntry {
  type: LibraryType;
  title: string;
  content: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cookie-less on purpose: a shared link has no session to scope to, and a
// client that read cookies() would force the standalone page to render per
// request instead of being cached. The RPC is the only thing anon may call,
// and it answers for an exact token or not at all.
// Request-memoized: generateMetadata and the page itself both want the same
// row, and without this that is two round trips per cold render.
export const fetchSharedEntry = cache(
  async (token: string): Promise<SharedEntry | null> => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data } = await supabase.rpc('shared_library_entry', { token });
    return data?.[0] ?? null;
  },
);
