'use client';

import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { useProgressStats } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/appStore';
import { useDrawer } from '@/lib/context/DrawerContext';
import { Icon } from '@/components/SidebarIcons';
import { SidebarNavLink } from './components/SidebarNavLink';
import { SidebarTopicTree } from './components/SidebarTopicTree';

export const Sidebar = () => {
  const stats = useProgressStats();
  const inboxCount = useAppStore((s) => s.inboxCount);
  const setAsideCount = useAppStore((s) => s.setAsideCount);
  const flagCounts = useAppStore((s) => s.flagCounts);
  const { drawerOpen, setDrawerOpen } = useDrawer();

  const totalCount = stats.total;
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <div
        className={`scrim ${drawerOpen ? 'show' : ''}`}
        onClick={closeDrawer}
      />
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <HoverPrefetchLink
            href="/"
            className="brand"
            onClick={closeDrawer}
          >
            <div className="brand-mark">P</div>
            <div>
              <div className="brand-title">Prep Tracker</div>
              <div className="brand-sub">
                Interview Prep · {totalCount} Q&apos;s
              </div>
            </div>
          </HoverPrefetchLink>
        </div>

        <nav className="sidebar-nav">
          <SidebarNavLink
            href="/"
            icon={<Icon.Home />}
            label="Dashboard"
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/inbox"
            icon={<Icon.Inbox />}
            label="Inbox"
            badge={inboxCount + setAsideCount}
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/starred"
            icon={<Icon.Star />}
            label="Starred"
            badge={flagCounts.starred}
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/grey-zone"
            icon={<Icon.GreyZone />}
            label="Grey Zone"
            badge={flagCounts.grey_zone}
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/priority-mix"
            icon={<Icon.Filter />}
            label="Priority Mix"
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/library"
            icon={<Icon.Book />}
            label="Library"
            onClick={closeDrawer}
          />
          <SidebarNavLink
            href="/settings"
            icon={<Icon.Gear />}
            label="Settings"
            onClick={closeDrawer}
          />

          <div className="sidebar-nav-sep" />

          <SidebarTopicTree />
        </nav>
      </aside>
    </>
  );
};
