import type { ParsedQuestion } from '@/lib/content/parser';
import { CodeAnswer } from './CodeAnswer';
import { DsaAnswer } from './DsaAnswer';
import { PlainAnswer } from './PlainAnswer';
import { SolutionRail } from './SolutionRail';

export function QuestionAnswerBody({ q }: { q: ParsedQuestion }) {
  // A DSA question is the only one carrying both — code-output questions never
  // set `problem`, problem/solution questions never set `code`. Order matters:
  // either single-field check would swallow it.
  if (q.code && q.problem) return <DsaAnswer q={q} />;
  if (q.code) return <CodeAnswer q={q} />;
  return q.problem ? <SolutionRail q={q} /> : <PlainAnswer q={q} />;
}
