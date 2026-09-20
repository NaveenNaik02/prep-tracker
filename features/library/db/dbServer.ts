import 'server-only';
import { getUser } from '@/lib/supabase/user';
import type { LibraryEntry } from '../types';

const COLUMNS = 'id, type, title, content, share_token, updated_at';

type Row = {
  id: string;
  type: LibraryEntry['type'];
  title: string;
  content: string;
  share_token: string;
  updated_at: string;
};

const toEntry = (row: Row): LibraryEntry => ({
  id: row.id,
  type: row.type,
  title: row.title,
  content: row.content,
  shareToken: row.share_token,
  updatedAt: row.updated_at,
});

export async function fetchLibraryEntries(): Promise<LibraryEntry[]> {
  const { supabase, user } = await getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('library_entries')
    .select(COLUMNS)
    .order('updated_at', { ascending: false });
  return (data ?? []).map(toEntry);
}

export async function fetchLibraryEntry(
  id: string,
): Promise<LibraryEntry | null> {
  const { supabase, user } = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('library_entries')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return data ? toEntry(data) : null;
}
