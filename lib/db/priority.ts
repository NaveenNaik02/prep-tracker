import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { PriorityLevel } from '@/lib/types';

export interface PriorityMixQuestion {
  id: string;
  number: number;
  title: string;
  bodyHtml: string;
  markdown?: string | null;
  createdBy?: string | null;
  topic: string;
  file: string;
  label: string;
  groupSlug: string;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
  problemHtml?: string | null;
  prerequisites?: string | null;
  code?: string | null;
  output?: string | null;
  priority: PriorityLevel | null;
  starred: boolean;
  greyZone: boolean;
}

const PRIORITY_COLUMNS =
  'id, number, title, body_html, markdown, created_by, topic, file, label, group_slug, lang, tags, problem, problem_html, prerequisites, code, output, priority, starred, grey_zone';

function mapRow(r: Record<string, unknown>): PriorityMixQuestion {
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
    starred: r.starred as boolean,
    greyZone: r.grey_zone as boolean,
  };
}

// Read-only. Mutations live in '@/lib/actions/questionFlags' (Server Actions).
export async function fetchPriorityQuestions(): Promise<PriorityMixQuestion[]> {
  return fetchPriorityQuestionsWithClient(supabase);
}

// Same read, but callable with a caller-supplied client (e.g. the
// cookie-scoped server client) instead of the browser singleton — RLS scopes
// this to the caller's own questions, so no userId param is needed.
export async function fetchPriorityQuestionsWithClient(
  client: SupabaseClient,
): Promise<PriorityMixQuestion[]> {
  const { data } = await client
    .from('questions')
    .select(PRIORITY_COLUMNS)
    .not('priority', 'is', null);
  return (data ?? []).map(mapRow);
}
