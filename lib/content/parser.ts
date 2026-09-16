import 'server-only';
import { cache } from 'react';
import { createClient } from '../supabase/server';
import type { SectionMeta } from './topics';
import type { PriorityLevel } from '../types';

export interface ParsedQuestion {
  id: string;
  number: number;
  title: string;
  bodyHtml: string;
  markdown?: string | null;
  createdBy?: string | null;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
  // The description rendered at write time. Only DSA questions set it —
  // `problem` alone renders as plain text on the problem/solution rail.
  problemHtml?: string | null;
  // Comma-separated, same shape as `tags`. DSA questions only.
  prerequisites?: string | null;
  // Set only on code-output questions — `code` is the discriminator, output
  // and the explanation (bodyHtml) are both optional on one. `code` together
  // with `problem` is what marks a DSA question instead.
  code?: string | null;
  output?: string | null;
  starred?: boolean;
  greyZone?: boolean;
  priority?: PriorityLevel | null;
}

export async function countQuestions(section: SectionMeta): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic', section.topic)
    .eq('file', section.file);
  return count ?? 0;
}

export const fetchAllCounts = cache(
  async (): Promise<Record<string, number>> => {
    const supabase = await createClient();
    // One row per subtopic, not per question — counting in Postgres keeps this
    // off the `max_rows` ceiling that silently truncated the old full-table
    // read. The view is security_invoker, so RLS still scopes it to the caller
    // (20260905071503_question_counts_view.sql).
    const { data, error } = await supabase
      .from('question_counts')
      .select('topic, file, count');

    if (error || !data) {
      // A missing view reads identically to an empty account here, so say which
      // it was — the counts land in the dashboard and sidebar as bare zeroes.
      if (error) console.error('fetchAllCounts:', error.message);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const r of data) {
      counts[`/${r.topic}/${r.file}`] = r.count;
    }
    return counts;
  },
);

export async function parseSection(
  section: Pick<SectionMeta, 'topic' | 'file'>,
): Promise<ParsedQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select(
      'id, number, title, body_html, markdown, created_by, lang, tags, problem, problem_html, prerequisites, code, output, starred, grey_zone, priority',
    )
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number');
  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    bodyHtml: r.body_html,
    markdown: r.markdown,
    createdBy: r.created_by,
    lang: r.lang,
    tags: r.tags,
    problem: r.problem,
    problemHtml: r.problem_html,
    prerequisites: r.prerequisites,
    code: r.code,
    output: r.output,
    starred: r.starred,
    greyZone: r.grey_zone,
    priority: r.priority,
  }));
}
