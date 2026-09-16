'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthor as requireAuthorUser } from '@/lib/supabase/user';
import { getAllGroups } from '@/lib/content/topicsData';
import {
  slugify,
  uniqueSlug,
  CODE_OUTPUT_FILE,
  type TopicGroup,
  type SectionMeta,
} from '@/lib/content/topics';

function requireAuthor(action: string) {
  return requireAuthorUser(`Sign in to ${action}`);
}

export interface AddTopicGroupInput {
  groupName: string;
  blurb: string;
  isDsa?: boolean;
}

// Creates a new top-level topic with no subtopics yet — mirrors how
// addQuestion in questions.ts writes straight to the shared `questions`
// table rather than anything client-local.
export async function addTopicGroup(
  input: AddTopicGroupInput,
): Promise<TopicGroup> {
  const { supabase, user } = await requireAuthor('add a topic');

  const groupName = input.groupName.trim();
  if (groupName.length < 2) throw new Error('Topic name is too short');
  const blurb = input.blurb.trim();
  const isDsa = !!input.isDsa;

  const groups = await getAllGroups();
  let slug = uniqueSlug(slugify(groupName), new Set(groups.map((g) => g.slug)));

  // slug is a global primary key, but the uniqueness check above only sees
  // the caller's own (owner-scoped) groups — another account may already
  // hold this exact slug invisibly. Retry with an incremented suffix on a
  // conflict instead of surfacing a raw Postgres error.
  const base = slug;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { error } = await supabase.from('topic_groups').insert({
      slug,
      group_name: groupName,
      blurb: blurb || null,
      is_dsa: isDsa,
      created_by: user.id,
    });
    if (!error) {
      revalidatePath('/');
      return {
        groupName,
        slug,
        blurb: blurb || undefined,
        isDsa,
        sections: [],
      };
    }
    if (error.code !== '23505') throw error;
    slug = `${base}-${attempt + 1}`;
  }
  throw new Error(
    'Could not find an available slug for this topic — try a different name.',
  );
}

export interface AddSectionInput {
  groupSlug: string;
  label: string;
  // Makes this the topic's code-output subtopic — it holds code snippets with
  // a collapsed output/explanation instead of a regular question list.
  isCode?: boolean;
  // Makes this a DSA subtopic. Implied for every subtopic of a DSA topic, so
  // callers only pass it for a DSA subtopic under an ordinary topic.
  isDsa?: boolean;
}

// Adds a subtopic to an existing (static or previously-added) topic group.
// `topic` is always the parent group's slug — new sections don't need the
// nested `topic/subtopic` folder convention static content sometimes uses
// (e.g. "react/ecosystem"), just something stable and unique per group.
export async function addSection(
  input: AddSectionInput,
): Promise<{ section: SectionMeta; group: TopicGroup }> {
  const { supabase, user } = await requireAuthor('add a subtopic');

  const label = input.label.trim();
  if (label.length < 2) throw new Error('Subtopic name is too short');

  const groups = await getAllGroups();
  const group = groups.find((g) => g.slug === input.groupSlug);
  if (!group) throw new Error('Unknown topic');

  const topic = group.slug;
  const takenFiles = new Set(
    group.sections.filter((s) => s.topic === topic).map((s) => s.file),
  );
  // A code-output subtopic keeps the label the user typed but never derives
  // its slug from it — see CODE_OUTPUT_FILE. One per topic falls out of the
  // (topic, file) primary key, so the insert is the check.
  const file = input.isCode
    ? CODE_OUTPUT_FILE
    : uniqueSlug(slugify(label), takenFiles);

  // A code-output subtopic is never also a DSA one — they're different bodies,
  // and the add-question FAB has to pick exactly one modal from this.
  const isDsa = !input.isCode && (input.isDsa || !!group.isDsa);

  const { error } = await supabase.from('sections').insert({
    topic,
    file,
    label,
    group_slug: group.slug,
    is_dsa: isDsa,
    created_by: user.id,
  });
  if (error) {
    if (input.isCode && error.code === '23505')
      throw new Error('This topic already has a code-output subtopic');
    throw error;
  }

  revalidatePath('/');
  revalidatePath(`/${group.slug}`);
  revalidatePath(`/${topic}/${file}`);

  const section: SectionMeta = { topic, file, label, isDsa };
  return {
    section,
    group: { ...group, sections: [...group.sections, section] },
  };
}

// Deletes a user-added subtopic. Refuses if it still has questions filed
// under it — never silently orphans content. RLS (see
// 20260716120000_topic_delete.sql) scopes the actual delete to the creator
// or an admin, same as deleteQuestion in questions.ts.
export async function deleteSection(
  topic: string,
  file: string,
): Promise<void> {
  const { supabase } = await requireAuthor('delete a subtopic');

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic', topic)
    .eq('file', file);
  if (count)
    throw new Error(
      `Delete or move its ${count} question${count === 1 ? '' : 's'} first`,
    );

  const { data, error } = await supabase
    .from('sections')
    .delete()
    .eq('topic', topic)
    .eq('file', file)
    .select('group_slug')
    .single();
  if (error || !data)
    throw new Error('You can only delete subtopics you created');

  revalidatePath('/');
  revalidatePath(`/${data.group_slug}`);
  revalidatePath(`/${topic}/${file}`);
}

// Deletes a user-added topic. Refuses if any of its subtopics still have
// questions — for custom groups `topic` is always the group's own slug (see
// addSection above), so a single count covers every subtopic underneath it.
// Deleting the topic_groups row cascades to its `sections` rows via the FK.
export async function deleteTopicGroup(slug: string): Promise<void> {
  const { supabase } = await requireAuthor('delete a topic');

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic', slug);
  if (count)
    throw new Error(
      `Delete or move its ${count} question${count === 1 ? '' : 's'} first`,
    );

  const { data, error } = await supabase
    .from('topic_groups')
    .delete()
    .eq('slug', slug)
    .select('slug')
    .single();
  if (error || !data) throw new Error('You can only delete topics you created');

  revalidatePath('/');
}

// Renames a topic. `slug` is deliberately left alone — it's baked into every
// question id under this topic (see the migration), so only the display text
// moves. Blurb rides along because it's the same modal.
export async function renameTopicGroup(
  slug: string,
  groupName: string,
  blurb: string,
): Promise<void> {
  const { supabase } = await requireAuthor('rename a topic');

  const name = groupName.trim();
  if (name.length < 2) throw new Error('Topic name is too short');

  const { data, error } = await supabase
    .from('topic_groups')
    .update({ group_name: name, blurb: blurb.trim() || null })
    .eq('slug', slug)
    .select('slug')
    .single();
  if (error || !data) throw new Error('You can only rename topics you created');

  revalidatePath('/');
  revalidatePath(`/${slug}`);
}

// Renames a subtopic. Same deal as above: `label` is display text, while
// (topic, file) is the section's identity and stays put.
export async function renameSection(
  topic: string,
  file: string,
  label: string,
): Promise<void> {
  const { supabase } = await requireAuthor('rename a subtopic');

  const trimmed = label.trim();
  if (trimmed.length < 2) throw new Error('Subtopic name is too short');

  const { data, error } = await supabase
    .from('sections')
    .update({ label: trimmed })
    .eq('topic', topic)
    .eq('file', file)
    .select('group_slug')
    .single();
  if (error || !data)
    throw new Error('You can only rename subtopics you created');

  revalidatePath('/');
  revalidatePath(`/${data.group_slug}`);
  revalidatePath(`/${topic}/${file}`);
}
