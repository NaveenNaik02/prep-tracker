import type { PriorityLevel } from '@/lib/types';

// Split from generateDsaQuestion.ts because that file is 'use server' and may
// only export async functions — same reason models.ts exists separately.

// What "Generate all" fills. `title` is deliberately absent: it's the input
// the rest are generated from, so a bulk run must never overwrite it.
// `subtopic` is absent too — it's only offered when the form has a picker,
// which the caller knows and this list doesn't.
export const BULK_FIELDS = [
  'description',
  'prerequisites',
  'code',
  'output',
  'explanation',
  'difficulty',
] as const;

export type DsaField = (typeof BULK_FIELDS)[number] | 'title' | 'subtopic';

// Every value is a string the form can drop straight into its field —
// `prerequisites` comes back from the model as an array and is joined on the
// server, because it's stored comma-separated.
export interface DsaDraft {
  title?: string;
  subtopic?: string;
  description?: string;
  prerequisites?: string;
  code?: string;
  output?: string;
  explanation?: string;
  difficulty?: PriorityLevel;
}
