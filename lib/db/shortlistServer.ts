import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PriorityLevel } from '@/lib/types';
import type { ShortlistFlag, ShortlistQuestion } from './shortlist';

// Split from shortlist.ts because that file is type-imported all over the
// client (the store, QuestionShortlist, both feature clients) while this one
// pulls in next/headers via createClient().
const SHORTLIST_COLUMNS =
  'id, number, title, body_html, markdown, created_by, topic, file, label, group_slug, lang, tags, problem, problem_html, prerequisites, code, output, priority';

function mapRow(r: Record<string, unknown>): ShortlistQuestion {
  return {
    id: r.id as string,
    number: r.number as number,
    title: r.title as string,
    bodyHtml: r.body_html as string,
    markdown: r.markdown as string | null,
    createdBy: r.created_by as string | null,
    topic: r.topic as string,
    file: r.file as string,
    label: r.label as string,
    groupSlug: r.group_slug as string,
    lang: r.lang as string | null,
    tags: r.tags as string | null,
    problem: r.problem as string | null,
    problemHtml: r.problem_html as string | null,
    prerequisites: r.prerequisites as string | null,
    code: r.code as string | null,
    output: r.output as string | null,
    priority: r.priority as PriorityLevel | null,
  };
}

// Read-only. Mutations live in '@/lib/actions/questionFlags' (Server Actions).
// RLS scopes this to the caller's own questions, so no user id and no client
// argument.
export async function fetchShortlistQuestions(
  flag: ShortlistFlag,
): Promise<ShortlistQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select(SHORTLIST_COLUMNS)
    .eq(flag, true);
  return (data ?? []).map(mapRow);
}

// The topic overview's "Unstar all" / "Clear grey zone" need the actual ids,
// not just counts — they decide whether the button renders and are what gets
// passed to bulkSetFlag. questions.group_slug is NOT NULL, so one equality
// covers every subtopic under the topic without enumerating (topic, file).
export async function fetchTopicFlagIds(
  groupSlug: string,
): Promise<Record<ShortlistFlag, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select('id, starred, grey_zone')
    .eq('group_slug', groupSlug)
    .or('starred.eq.true,grey_zone.eq.true');
  const rows = data ?? [];
  return {
    starred: rows.filter((r) => r.starred).map((r) => r.id),
    grey_zone: rows.filter((r) => r.grey_zone).map((r) => r.id),
  };
}
