import { Pin } from 'lucide-react';
import { TopicGroup, byPinnedFirst } from '@/lib/content/topics';
import { TopicCard, DashboardHero, PinnedGrid } from './components';

interface Props {
  groups: TopicGroup[];
}

export default function Dashboard({ groups }: Props) {
  const pinned = groups.filter((g) => g.pinnedAt).sort(byPinnedFirst);
  const rest = groups.filter((g) => !g.pinnedAt);

  return (
    <>
      <DashboardHero />

      {pinned.length > 0 && (
        <>
          <p className="dash-section-label">
            <Pin size={12} /> Pinned
          </p>
          <PinnedGrid groups={pinned} />
          <p className="dash-section-label dash-section-sep">All topics</p>
        </>
      )}

      <div className="dash-grid">
        {rest.map((group) => (
          <TopicCard key={group.slug} group={group} />
        ))}
      </div>
    </>
  );
}
