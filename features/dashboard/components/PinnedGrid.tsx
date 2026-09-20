'use client';

import { useState } from 'react';
import { TopicGroup } from '@/lib/content/topics';
import { reorderPinnedTopics } from '@/lib/actions/topicPins';
import { usePinnedDrag } from '../hooks/usePinnedDrag';
import TopicCard from './TopicCard';

interface PinnedGridProps {
  groups: TopicGroup[];
}

export const PinnedGrid = ({ groups }: PinnedGridProps) => {
  // Drag order is local so cards move under the pointer; the server value
  // arrives on the next revalidate and this list is rebuilt from it.
  const [order, setOrder] = useState<string[] | null>(null);
  const serverSlugs = groups.map((g) => g.slug);

  // A pin added or removed elsewhere changes the set, which retires whatever
  // local order predates it.
  const sameSet =
    order?.length === serverSlugs.length &&
    order.every((s) => serverSlugs.includes(s));
  const slugs = sameSet ? order! : serverSlugs;

  const bySlug = new Map(groups.map((g) => [g.slug, g]));

  const onReorder = (next: string[]) => {
    setOrder(next);
    reorderPinnedTopics(next).catch(() => setOrder(null));
  };

  const { gridRef, dragSlug, dropSlug, handlePointerDown } = usePinnedDrag({
    slugs,
    onReorder,
  });

  return (
    <div className="dash-grid" ref={gridRef}>
      {slugs.map((slug) => {
        const group = bySlug.get(slug);
        if (!group) return null;
        return (
          <TopicCard
            key={slug}
            group={group}
            dragging={dragSlug === slug}
            dropTarget={dropSlug === slug}
            onDragPointerDown={handlePointerDown(slug)}
          />
        );
      })}
    </div>
  );
};
