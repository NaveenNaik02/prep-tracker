'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { LIB_TYPES, type LibraryEntry, type LibraryType } from '../types';

export interface LibraryEntryInput {
  type: LibraryType;
  title: string;
  content: string;
}

// The type reaches the server as a plain string from the form's select, and
// the column's CHECK constraint would reject an unknown one with a Postgres
// error rather than something a user can act on.
function validate(input: LibraryEntryInput) {
  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length < 2) throw new Error('Give the entry a title');
  if (content.length < 4) throw new Error('Write a bit more before saving');
  if (!LIB_TYPES.some((t) => t.value === input.type)) {
    throw new Error('Pick a type for this entry');
  }
  return { type: input.type, title, content };
}

export async function addLibraryEntry(
  input: LibraryEntryInput,
): Promise<LibraryEntry> {
  const { supabase, user } = await requireUser();
  const fields = validate(input);

  const { data, error } = await supabase
    .from('library_entries')
    .insert({ ...fields, user_id: user.id })
    .select('id, type, title, content, share_token, updated_at')
    .single();
  if (error || !data) throw error ?? new Error('Could not save — try again.');

  revalidatePath('/library');
  return {
    id: data.id,
    type: data.type,
    title: data.title,
    content: data.content,
    shareToken: data.share_token,
    updatedAt: data.updated_at,
  };
}

export async function updateLibraryEntry(
  id: string,
  input: LibraryEntryInput,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const fields = validate(input);

  const { error } = await supabase
    .from('library_entries')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;

  revalidatePath('/library');
  revalidatePath(`/library/${id}`);
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('library_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;

  revalidatePath('/library');
}

export interface LibraryConcept {
  id: string;
  title: string;
  // The standalone page's token: a prerequisite naming this entry opens
  // /read/<shareToken>, not the in-app article.
  shareToken: string;
}

// Names and share tokens — the DSA modal's Prerequisites field offers these
// as suggestions and matches typed text against them by name.
export async function listLibraryConcepts(): Promise<LibraryConcept[]> {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from('library_entries')
    .select('id, title, share_token')
    .order('title');
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    shareToken: row.share_token,
  }));
}
