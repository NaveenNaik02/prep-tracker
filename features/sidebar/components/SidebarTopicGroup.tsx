'use client';

import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { useProgressStats } from '@/lib/hooks';
import { Icon } from '@/components/SidebarIcons';
import { SidebarSubtopicRow } from './SidebarSubtopicRow';

interface Props {
  group: TopicGroup;
  // Owned by SidebarTopicTree — only one group is open at a time, which no
  // single group can know on its own.
  expanded: boolean;
  onToggle: () => void;
}

export const SidebarTopicGroup = ({ group, expanded, onToggle }: Props) => {
  const stats = useProgressStats();

  const { done, total } = group.sections.reduce(
    (acc, s) => {
      const sStats = stats.bySection[sectionUrl(s)];
      return sStats
        ? { done: acc.done + sStats.completed, total: acc.total + sStats.total }
        : acc;
    },
    { done: 0, total: 0 },
  );

  return (
    <div className="topic-group">
      <button className="topic-row" aria-expanded={expanded} onClick={onToggle}>
        <Icon.Chevron />
        <span className="topic-name">
          {group.groupName}
          {group.isDsa && <span className="dsa-badge">DSA</span>}
        </span>
        <span className="topic-progress">
          {done}/{total}
        </span>
      </button>

      {expanded && (
        <ul className="subtopic-list">
          {group.sections.map((s) => (
            <SidebarSubtopicRow key={sectionUrl(s)} section={s} />
          ))}
        </ul>
      )}
    </div>
  );
};
