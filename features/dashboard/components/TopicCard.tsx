'use client';

import {
  CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useState,
} from 'react';
import { Pin } from 'lucide-react';
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { topicHue, topicIcon } from '@/lib/content/topicMeta';
import { setTopicPinned } from '@/lib/actions/topicPins';
import { useProgressStats } from '@/lib/hooks';

interface TopicCardProps {
  group: TopicGroup;
  // Only the Pinned grid is draggable; elsewhere these stay undefined.
  dragging?: boolean;
  onDragPointerDown?: (e: PointerEvent) => void;
}

export default function TopicCard({
  group,
  dragging,
  onDragPointerDown,
}: TopicCardProps) {
  const stats = useProgressStats();
  const [pinned, setPinned] = useState(!!group.pinnedAt);
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

  // The pin sits inside the card's link, so every activation has to stop the
  // anchor from navigating as well as bubbling.
  const togglePin = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !pinned;
    setPinned(next);
    setTopicPinned(group.slug, next).catch(() => setPinned(!next));
  };

  const togglePinOnKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') togglePin(e);
  };

  return (
    <div
      className={`topic-card${onDragPointerDown ? ' tc-draggable' : ''}${dragging ? ' tc-dragging' : ''}`}
      data-slug={group.slug}
      onPointerDown={onDragPointerDown}
    >
      <HoverPrefetchLink href={`/${group.slug}`} className="tc-main">
        <div className="tc-top">
          <div
            className="tc-badge"
            style={{ '--h': hue } as CSSProperties}
            aria-hidden="true"
          >
            {topicIcon(group.groupName)}
          </div>
          <div className="tc-top-right">
            <span
              className={`tc-pin${pinned ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${pinned ? 'Unpin' : 'Pin'} ${group.groupName}`}
              aria-pressed={pinned}
              title={pinned ? 'Unpin' : 'Pin to top'}
              onClick={togglePin}
              onKeyDown={togglePinOnKey}
            >
              <Pin size={13} />
            </span>
            <div
              className="tc-ring"
              style={{ '--h': hue, '--p': pct } as CSSProperties}
            >
              <span>{pct}%</span>
            </div>
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
