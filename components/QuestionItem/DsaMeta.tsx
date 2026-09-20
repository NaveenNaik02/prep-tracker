import type { MouseEvent } from 'react';
import type { PriorityLevel } from '@/lib/types';
import type { Prereq } from './splitList';

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
interface PrereqTagsProps {
  prerequisites: Prereq[];
  // Lowercased Library entry title -> the URL of its standalone page. A
  // prerequisite naming one opens that write-up; the index is passed in
  // because this folder stays independent of any feature.
  libraryIndex?: Record<string, string>;
}

export function PrereqTags({ prerequisites, libraryIndex }: PrereqTagsProps) {
  // The row itself opens the question, so every tag link stops the click.
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div className="q-prereq-row">
      {prerequisites.map((p) => {
        const libraryHref = libraryIndex?.[p.text.trim().toLowerCase()];

        if (!p.link && libraryHref) {
          return (
            <a
              className="q-prereq-tag has-link"
              key={p.text}
              href={libraryHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              title={`Read ${p.text} in your Library`}
            >
              {p.text}
            </a>
          );
        }

        return p.link ? (
          <a
            className="q-prereq-tag has-link"
            key={p.text}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
          >
            {p.text}
          </a>
        ) : (
          <span className="q-prereq-tag" key={p.text}>
            {p.text}
          </span>
        );
      })}
    </div>
  );
}
