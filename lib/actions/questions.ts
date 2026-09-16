'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { createClient } from '@/lib/supabase/server';
import { requireAuthor } from '@/lib/supabase/user';
import { findSection, findGroupForSection } from '@/lib/content/topics';
import { getAllGroups } from '@/lib/content/topicsData';
import type { ParsedQuestion } from '@/lib/content/parser';
import type { PriorityLevel } from '@/lib/types';

// These routes are dynamic, not ISR. The call still matters: a Server Action
// evicts the client's prefetch cache only when it revalidates something, and
// links here hover-prefetch, so a write could otherwise stay invisible behind
// a stale payload. Covers the section and its topic overview, whose question
// counts would go stale too.
function revalidateSection(topic: string, file: string) {
  revalidatePath(`/${topic}/${file}`);
  revalidatePath(`/${topic}`);
}

export interface AddQuestionInput {
  topic: string;
  file: string;
  title: string;
  markdown: string;
  lang?: string;
  tags?: string;
  problem?: string;
  prerequisites?: string;
  code?: string;
  output?: string;
  priority?: PriorityLevel | null;
  starred?: boolean;
}

// .q-body only defines heading styles for <h4> — remap every markdown
// heading level so user-authored answers match hand-authored ones.
function renderAnswerHtml(markdown: string): string {
  if (!markdown) return '';
  const raw = marked.parse(markdown, { breaks: true }) as string;
  const remapped = raw
    .replace(/<h[1-6]([^>]*)>/gi, '<h4$1>')
    .replace(/<\/h[1-6]>/gi, '</h4>');
  return DOMPurify.sanitize(remapped);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Migrates the current user's own id-keyed rows (progress, question_position)
// from a question's old id to its new one after a cross-section move —
// otherwise a question the user had already checked off would silently read
// as "not done" again once its id changes, and its manual ordering would be
// orphaned. starred/priority need no such migration: they're columns on the
// same questions row, and the update that mints the new id (`UPDATE questions
// SET id = newId ... WHERE id = oldId`) carries them along for free.
// Cross-user rows (e.g. someone else's completion on a shared ETL question)
// are out of scope: this app has no service-role client to touch rows outside
// the caller's own (same limitation noted on deleteQuestion's cleanup below).
async function carryOverUserRows(
  supabase: SupabaseServerClient,
  userId: string,
  oldId: string,
  newId: string,
) {
  const { data: prog } = await supabase
    .from('progress')
    .select('user_id')
    .eq('user_id', userId)
    .eq('question_id', oldId)
    .maybeSingle();
  if (prog) {
    // progress has no UPDATE policy (row presence is the state) — insert the
    // new row before dropping the old one so a failure here can't lose it.
    await supabase
      .from('progress')
      .insert({ user_id: userId, question_id: newId });
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', oldId);
  }

  // question_position does have an own-row UPDATE policy, so a rename is one
  // statement. The client already mirrors this via renameOrderId() — without
  // the DB write the manual ordering silently reverts on the next load.
  await supabase
    .from('question_position')
    .update({ question_id: newId })
    .eq('user_id', userId)
    .eq('question_id', oldId);
}

// A code-output question is a snippet plus (optionally) its output and an
// explanation — both of those can legitimately be blank, so `code` carries
// the length check the answer normally would. A DSA question is the same but
// with a description, which is the field that must not be blank: `code` plus
// `problem` is what makes the saved row render as one.
function validateQuestion(
  title: string,
  markdown: string,
  code: string,
  problem: string,
) {
  if (title.length < 4) throw new Error('Question is too short');
  if (code) {
    if (code.length < 4) throw new Error('Code snippet is too short');
    if (problem && problem.length < 4)
      throw new Error('Description is too short');
    return;
  }
  if (markdown.length < 4) throw new Error('Answer is too short');
}

export async function addQuestion(
  input: AddQuestionInput,
): Promise<ParsedQuestion> {
  const { supabase, user } = await requireAuthor(
    'Sign in to add your own questions',
  );

  // QuestionItem renders q.title via dangerouslySetInnerHTML (existing ETL
  // titles are plain text authored by the developer) — strip all tags so a
  // user-submitted title can't inject markup into other visitors' pages.
  const title = DOMPurify.sanitize(input.title.trim(), { ALLOWED_TAGS: [] });
  const markdown = input.markdown.trim();
  const code = input.code?.trim() ?? '';
  const problem = input.problem?.trim() ?? '';
  validateQuestion(title, markdown, code, problem);

  const groups = await getAllGroups();
  const segments = [...input.topic.split('/'), input.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const bodyHtml = renderAnswerHtml(markdown);
  // Only DSA questions have a description; the problem/solution rail renders
  // `problem` as plain text and never reads this.
  const problemHtml = code ? renderAnswerHtml(problem) : '';

  const { data: maxRow } = await supabase
    .from('questions')
    .select('number')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (maxRow?.number ?? 0) + 1;

  const id = `${section.topic}/${section.file}/u-${randomUUID()}`;

  const { error } = await supabase.from('questions').insert({
    id,
    topic: section.topic,
    file: section.file,
    number,
    title,
    body_html: bodyHtml,
    markdown,
    label: section.label,
    group_slug: group.slug,
    created_by: user.id,
    lang: input.lang?.trim() || null,
    tags: input.tags?.trim() || null,
    problem: problem || null,
    problem_html: problemHtml || null,
    prerequisites: input.prerequisites?.trim() || null,
    code: code || null,
    output: input.output?.trim() || null,
    starred: input.starred ?? false,
    priority: input.priority ?? null,
  });
  if (error) throw error;

  revalidateSection(section.topic, section.file);

  return { id, number, title, bodyHtml };
}

export async function updateQuestion(
  id: string,
  input: AddQuestionInput,
): Promise<ParsedQuestion> {
  const { supabase, user } = await requireAuthor(
    'Sign in to edit your questions',
  );

  const title = DOMPurify.sanitize(input.title.trim(), { ALLOWED_TAGS: [] });
  const markdown = input.markdown.trim();

  const groups = await getAllGroups();
  const segments = [...input.topic.split('/'), input.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const { data: existing } = await supabase
    .from('questions')
    .select('topic, file, number, code, output, prerequisites, tags, problem')
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new Error('Question not found');

  // Forms that don't own a field leave it off the input entirely, and must not
  // blank it: the plain question form has no code/output/prerequisites inputs,
  // and the DSA form has no tags input, so editing through either would
  // otherwise null what the other owns. Absent means keep; an empty string
  // still clears.
  const code = input.code?.trim() ?? existing.code ?? '';
  const output = input.output?.trim() ?? existing.output ?? '';
  const prerequisites =
    input.prerequisites?.trim() ?? existing.prerequisites ?? '';
  const tags = input.tags?.trim() ?? existing.tags ?? '';
  // CodeQuestionModal sends no `problem`, and the DSA discriminator is
  // per-row (`code && problem`) not per-section — so a DSA question opened in
  // that form would otherwise be silently demoted to a code-output one.
  const problem = input.problem?.trim() ?? existing.problem ?? '';

  validateQuestion(title, markdown, code, problem);

  const changedSection =
    existing.topic !== section.topic || existing.file !== section.file;

  let number = existing.number;
  if (changedSection) {
    const { data: maxRow } = await supabase
      .from('questions')
      .select('number')
      .eq('topic', section.topic)
      .eq('file', section.file)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();
    number = (maxRow?.number ?? 0) + 1;
  }

  // ids are namespaced by section ("{topic}/{file}/…") — the sidebar and
  // per-section progress counts rely on that prefix to attribute a completed
  // id to the right subtopic without loading every question client-side.
  // Leaving the old id in place after a cross-section move would silently
  // break that attribution (the question would count toward the OLD
  // subtopic's completion forever, and could never reach 100% in the new
  // one), so mint a fresh id whenever the section actually changes.
  const newId = changedSection
    ? `${section.topic}/${section.file}/u-${randomUUID()}`
    : id;

  const bodyHtml = renderAnswerHtml(markdown);
  // Only DSA questions have a description; the problem/solution rail renders
  // `problem` as plain text and never reads this.
  const problemHtml = code ? renderAnswerHtml(problem) : '';

  const { data, error } = await supabase
    .from('questions')
    .update({
      id: newId,
      topic: section.topic,
      file: section.file,
      number,
      title,
      body_html: bodyHtml,
      markdown,
      label: section.label,
      group_slug: group.slug,
      lang: input.lang?.trim() || null,
      tags: tags || null,
      problem: problem || null,
      problem_html: problemHtml || null,
      prerequisites: prerequisites || null,
      code: code || null,
      output: output || null,
      priority: input.priority ?? null,
    })
    .eq('id', id)
    .select('id, number, title, body_html')
    .single();

  // RLS scopes the update to created_by = auth.uid() — a mismatch surfaces as
  // zero rows, not a thrown permission error. A populated `error` is something
  // else entirely (constraint violation, bad column) and must not be reported
  // as a permission problem: a foreign-key violation masquerading as "you can
  // only edit your own questions" is what hid 20260826170000's cloud drift.
  if (error) throw new Error(`Could not save question: ${error.message}`);
  if (!data) throw new Error('You can only edit your own questions.');

  if (changedSection) await carryOverUserRows(supabase, user.id, id, newId);

  revalidateSection(section.topic, section.file);
  if (changedSection) {
    revalidateSection(existing.topic, existing.file);
  }

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    bodyHtml: data.body_html,
  };
}

export interface MoveQuestionDestination {
  topic: string;
  file: string;
}

// A lighter-weight sibling of updateQuestion for the kebab menu's "Move
// to…" action — only touches placement (topic/file/label/group_slug/
// number), leaving title/markdown/etc. untouched, so the picker doesn't
// need to load or resubmit the full question content just to relocate it.
export async function moveQuestion(
  id: string,
  dest: MoveQuestionDestination,
): Promise<{ id: string }> {
  const { supabase, user } = await requireAuthor('Sign in to move questions');

  const groups = await getAllGroups();
  const segments = [...dest.topic.split('/'), dest.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const { data: existing } = await supabase
    .from('questions')
    .select('topic, file')
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new Error('Question not found');

  const { data: maxRow } = await supabase
    .from('questions')
    .select('number')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (maxRow?.number ?? 0) + 1;

  // Same reasoning as updateQuestion: the id's "{topic}/{file}/…" prefix is
  // what the client uses to attribute a completed question to its section,
  // so a move (always cross-section, per MoveQuestionModal's own guard) has
  // to mint a fresh id rather than just repointing topic/file/number.
  const newId = `${section.topic}/${section.file}/u-${randomUUID()}`;

  const { data, error } = await supabase
    .from('questions')
    .update({
      id: newId,
      topic: section.topic,
      file: section.file,
      number,
      label: section.label,
      group_slug: group.slug,
    })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error(`Could not move question: ${error.message}`);
  if (!data) throw new Error('You can only move your own questions.');

  await carryOverUserRows(supabase, user.id, id, newId);

  revalidateSection(section.topic, section.file);
  revalidateSection(existing.topic, existing.file);

  return { id: data.id };
}

export async function deleteQuestion(id: string | string[]): Promise<void> {
  const { supabase, user } = await requireAuthor(
    'Sign in to delete your questions',
  );

  const ids = Array.isArray(id) ? id : [id];
  if (ids.length === 0) return;

  const { data, error } = await supabase
    .from('questions')
    .delete()
    .in('id', ids)
    .select('topic, file');
  if (error) throw new Error(`Could not delete question: ${error.message}`);
  if (!data?.length) throw new Error('You can only delete your own questions.');

  // Best-effort cleanup of the current user's own progress rows for these
  // questions (starred/priority are columns on the deleted rows themselves, so
  // they're already gone). Cross-user orphan cleanup is out of scope —
  // there's no service-role client in this app, and it's a rare edge case.
  await supabase
    .from('progress')
    .delete()
    .eq('user_id', user.id)
    .in('question_id', ids);

  for (const key of new Set(data.map((q) => `${q.topic}\u0000${q.file}`))) {
    const [topic, file] = key.split('\u0000');
    revalidateSection(topic, file);
  }
}
