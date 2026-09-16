import type { PriorityLevel } from '@/lib/types';

// Difficulty is `priority` read under DSA labels — same three levels, same
// column, so a DSA question's difficulty is filterable and sortable as
// priority everywhere else in the app for free.
const DIFFICULTY: Record<PriorityLevel, string> = {
  low: 'Easy',
  med: 'Medium',
  high: 'Hard',
};

export function DifficultyPill({ priority }: { priority: PriorityLevel }) {
  return (
    <span className={`diff ${priority}`}>
      <span className="diff-dot" />
      {DIFFICULTY[priority]}
    </span>
  );
}

// What the solver should already know, shown on the row header so it's
// visible without expanding the question. Patterns are authored too, but they
// steer AI generation rather than earning space on the card.
export function PrereqTags({ prerequisites }: { prerequisites: string[] }) {
  return (
    <div className="q-prereq-row">
      {prerequisites.map((p) => (
        <span className="q-prereq-tag" key={p}>
          {p}
        </span>
      ))}
    </div>
  );
}
