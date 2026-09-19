'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthor as requireAuthorUser } from '@/lib/supabase/user';

function requireAuthor(action: string) {
  return requireAuthorUser(`Sign in to ${action}`);
}

export async function setTopicPinned(
  slug: string,
  pinned: boolean,
): Promise<void> {
  const { supabase } = await requireAuthor('pin a topic');

  // The timestamp is the sort key for the Pinned section, so pinning stamps
  // now() and unpinning clears it.
  const { error } = await supabase
    .from('topic_groups')
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq('slug', slug);
  if (error) throw new Error('Could not pin topic');

  revalidatePath('/');
}

// Dragging the Pinned section rewrites the sort key it reads from. Timestamps
// are spaced a second apart from one base so the saved order is exactly the
// order passed in, with no ties.
export async function reorderPinnedTopics(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const { supabase } = await requireAuthor('reorder pinned topics');

  const base = Date.now() - slugs.length * 1000;
  const results = await Promise.all(
    slugs.map((slug, i) =>
      supabase
        .from('topic_groups')
        .update({ pinned_at: new Date(base + i * 1000).toISOString() })
        .eq('slug', slug),
    ),
  );
  if (results.some((r) => r.error)) throw new Error('Could not reorder pins');

  revalidatePath('/');
}
