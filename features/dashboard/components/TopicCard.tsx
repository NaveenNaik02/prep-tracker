'use client';

import { CSSProperties } from 'react';
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { topicHue, topicIcon } from '@/lib/content/topicMeta';
import { useProgressStats } from '@/lib/hooks';

interface TopicCardProps {
  group: TopicGroup;
}

export default function TopicCard({ group }: TopicCardProps) {
  const stats = useProgressStats();
  const hasSections = group.sections.length > 0;

  let done = 0;
  let total = 0;
  group.sections.forEach((s) => {
    const sStats = stats.bySection[sectionUrl(s)];
    if (sStats) {
      done += sStats.completed;
      total += sStats.total;
    }
  });

  const pct = total ? Math.round((done / total) * 100) : 0;
  const hue = topicHue(group.groupName);

  return (
    <div className="topic-card">
      <HoverPrefetchLink href={`/${group.slug}`} className="tc-main">
        <div className="tc-top">
          <div
            className="tc-badge"
            style={{ '--h': hue } as CSSProperties}
            aria-hidden="true"
          >
            {topicIcon(group.groupName)}
          </div>
          <div
            className="tc-ring"
            style={{ '--h': hue, '--p': pct } as CSSProperties}
          >
            <span>{pct}%</span>
          </div>
        </div>
        <div className="tc-head">
          <span className="tc-name">
            {group.groupName}
            {group.isDsa && <span className="dsa-badge">DSA</span>}
          </span>
        </div>
        <p className="tc-blurb">{group.blurb}</p>
        {hasSections ? (
          <div className="tc-foot">
            <span>
              {done}/{total} done
            </span>
            <span>{total} Q</span>
          </div>
        ) : (
          <div className="tc-foot">
            <span>No subtopics yet</span>
          </div>
        )}
      </HoverPrefetchLink>
    </div>
  );
}
