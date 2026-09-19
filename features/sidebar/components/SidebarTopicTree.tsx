'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { sectionUrl, byPinnedFirst } from '@/lib/content/topics';
import { useAppStore } from '@/lib/stores/appStore';
import { SidebarTopicGroup } from './SidebarTopicGroup';
import { SidebarEmptyState } from './SidebarEmptyState';

export const SidebarTopicTree = () => {
  const groups = useAppStore((s) => s.groups);
  const pathname = usePathname();

  // Which group the current route belongs to, if any.
  const activeSlug =
    groups.find(
      (g) =>
        pathname === `/${g.slug}` ||
        g.sections.some((s) => pathname === sectionUrl(s)),
    )?.slug ?? null;

  // One open group at a time, so this lives here rather than per-group.
  const [expandedSlug, setExpandedSlug] = useState(activeSlug);
  const [wasActive, setWasActive] = useState(activeSlug);

  // Navigating into a group opens it (and closes whichever was open). Adjusting
  // state during render rather than in an effect avoids a flash of the old
  // group still expanded.
  if (activeSlug !== wasActive) {
    setWasActive(activeSlug);
    if (activeSlug) setExpandedSlug(activeSlug);
  }

  if (groups.length === 0) return <SidebarEmptyState />;

  // Pinned topics lead here too, in the same order as the dashboard's Pinned
  // section.
  const ordered = [...groups].sort(byPinnedFirst);

  return (
    <>
      {ordered.map((group) => (
        <SidebarTopicGroup
          key={group.slug}
          group={group}
          expanded={expandedSlug === group.slug}
          onToggle={() =>
            setExpandedSlug((slug) => (slug === group.slug ? null : group.slug))
          }
        />
      ))}
    </>
  );
};
