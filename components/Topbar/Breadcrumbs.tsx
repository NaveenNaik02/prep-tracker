'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSearch } from '@/lib/context/SearchContext';
import { useAppStore } from '@/lib/stores/appStore';
import {
  findGroup,
  findSection,
  findGroupForSection,
  type TopicGroup,
} from '@/lib/content/topics';

// Routes that are their own crumb. Matched before the generic section lookup
// below, since findSection(['settings']) etc. return null (they're not real
// topic/section paths) and would otherwise leave the breadcrumb blank.
const FLAT_CRUMBS: Record<string, string> = {
  '/': 'Dashboard',
  '/settings': 'Settings',
  '/inbox': 'Inbox',
  '/priority-mix': 'Priority Mix',
  '/starred': 'Starred',
  '/grey-zone': 'Grey Zone',
};

const ParentCrumb = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <>
    <Link
      href={href}
      className="crumb crumb-parent hover:text-[var(--text)] transition-colors"
    >
      {children}
    </Link>
    <span className="crumb crumb-sep crumb-parent">/</span>
  </>
);

// A crumb shown on its own ("Starred", "Search results") stays muted; only
// the last crumb of a trail is highlighted.
const CurrentCrumb = ({
  highlight,
  children,
}: {
  highlight: boolean;
  children: ReactNode;
}) => {
  if (!highlight) return <span className="crumb">{children}</span>;
  return (
    <span className="crumb crumb-current" style={{ color: 'var(--text)' }}>
      {children}
    </span>
  );
};

type Crumb = { label: string; href?: string };

const DASHBOARD: Crumb = { label: 'Dashboard', href: '/' };

const resolveCrumbs = (
  pathname: string,
  topicSlug: string | null,
  groups: TopicGroup[],
): Crumb[] => {
  const flat = FLAT_CRUMBS[pathname];
  if (flat) {
    // Starred / Grey Zone drill into one topic via ?topic=<slug>.
    const topic = topicSlug ? findGroup(groups, topicSlug) : null;
    if (!topic) return [{ label: flat }];
    return [{ label: flat, href: pathname }, { label: topic.groupName }];
  }

  const segments = pathname.split('/').filter(Boolean);

  // Single segment → topic overview. Checked before findSection, which only
  // matches topic/file pairs and would return null here.
  if (segments.length === 1) {
    const group = findGroup(groups, segments[0]);
    return group ? [DASHBOARD, { label: group.groupName }] : [];
  }

  const section = findSection(groups, segments);
  if (!section) return [];
  const group = findGroupForSection(groups, section);
  const topicCrumbs = group
    ? [{ label: group.groupName, href: `/${group.slug}` }]
    : [];
  return [DASHBOARD, ...topicCrumbs, { label: section.label }];
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { query } = useSearch();
  const groups = useAppStore((s) => s.groups);
  const topicParam = useSearchParams().get('topic');

  const searching = query.trim().length >= 2;
  const crumbs = searching
    ? [{ label: 'Search results' }]
    : resolveCrumbs(pathname, topicParam, groups);
  const isTrail = crumbs.length > 1;

  return crumbs.map((c: Crumb) =>
    c.href ? (
      <ParentCrumb key={c.href} href={c.href}>
        {c.label}
      </ParentCrumb>
    ) : (
      <CurrentCrumb key={c.label} highlight={isTrail}>
        {c.label}
      </CurrentCrumb>
    ),
  );
}
