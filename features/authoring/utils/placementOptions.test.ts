import { describe, it, expect } from 'vitest';
import type { TopicGroup } from '@/lib/content/topics';
import { buildPlacementOptions } from './placementOptions';
import { PENDING_GROUP_SLUG, PENDING_SECTION_KEY } from '../types';

const groups: TopicGroup[] = [
  {
    slug: 'react',
    groupName: 'React',
    sections: [
      { topic: 'react', file: 'hooks', label: 'Hooks' },
      { topic: 'react', file: 'perf', label: 'Performance' },
    ],
  },
  {
    slug: 'javascript',
    groupName: 'JavaScript',
    sections: [{ topic: 'javascript', file: 'async', label: 'Async' }],
  },
];

describe('buildPlacementOptions', () => {
  it('lists the real topics and the selected topic’s subtopics', () => {
    const { topicOptions, sectionOptions } = buildPlacementOptions(
      groups,
      'react',
      null,
    );
    expect(topicOptions.map((o) => o.value)).toEqual(['react', 'javascript']);
    expect(sectionOptions.map((o) => o.value)).toEqual([
      'react/hooks',
      'react/perf',
    ]);
    expect(topicOptions.every((o) => o.sub === undefined)).toBe(true);
  });

  it('excludes code-output and DSA subtopics as placement targets', () => {
    const withSpecial: TopicGroup[] = [
      {
        slug: 'dsa',
        groupName: 'DSA',
        isDsa: true,
        sections: [
          { topic: 'dsa', file: 'arrays', label: 'Arrays', isDsa: true },
          { topic: 'dsa', file: 'code_output', label: 'Code Output' },
          { topic: 'dsa', file: 'theory', label: 'Theory' },
        ],
      },
    ];
    const { sectionOptions } = buildPlacementOptions(withSpecial, 'dsa', null);
    expect(sectionOptions.map((o) => o.value)).toEqual(['dsa/theory']);
  });

  it('appends a staged subtopic only under its own topic', () => {
    const pending = {
      mode: 'new-subtopic',
      groupSlug: 'react',
      label: 'Suspense',
      reasoning: '',
    } as const;

    const onParent = buildPlacementOptions(groups, 'react', pending);
    expect(onParent.sectionOptions.at(-1)).toEqual({
      value: PENDING_SECTION_KEY,
      label: 'Suspense',
      sub: 'new',
    });

    // Switched to a different topic — hidden, but not discarded.
    const elsewhere = buildPlacementOptions(groups, 'javascript', pending);
    expect(elsewhere.sectionOptions.map((o) => o.value)).toEqual([
      'javascript/async',
    ]);
  });

  it('offers a staged topic alongside the real ones, with its single subtopic', () => {
    const pending = {
      mode: 'new-topic',
      topicName: 'Web Workers',
      blurb: '',
      label: 'Basics',
      reasoning: '',
    } as const;

    // Staged, but a real topic is still selected: the new topic is offered,
    // the subtopics stay those of the real selection.
    const notSelected = buildPlacementOptions(groups, 'react', pending);
    expect(notSelected.topicOptions.at(-1)).toEqual({
      value: PENDING_GROUP_SLUG,
      label: 'Web Workers',
      sub: 'new',
    });
    expect(notSelected.sectionOptions.map((o) => o.value)).toEqual([
      'react/hooks',
      'react/perf',
    ]);

    // Selected: no real group, and exactly the one subtopic staged with it.
    const selected = buildPlacementOptions(groups, PENDING_GROUP_SLUG, pending);
    expect(selected.group).toBeNull();
    expect(selected.sectionOptions).toEqual([
      { value: PENDING_SECTION_KEY, label: 'Basics', sub: 'new' },
    ]);
  });

  it('falls back to the first group when the slug matches nothing', () => {
    const { group } = buildPlacementOptions(groups, 'deleted-topic', null);
    expect(group?.slug).toBe('react');
  });
});
