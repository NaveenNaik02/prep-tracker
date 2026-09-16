import type { PriorityLevel } from '@/lib/types';

// The two hand-curated shortlists a question can be on. Spelled as the
// `questions` columns they are, so they pass straight into a query. Lives
// here rather than in either feature — the store's badge counts and both
// features read it.
export type ShortlistFlag = 'starred' | 'grey_zone';

export interface ShortlistQuestion {
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
}
