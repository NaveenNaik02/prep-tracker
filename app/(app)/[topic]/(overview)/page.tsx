import { notFound } from 'next/navigation';
import { findGroup } from '@/lib/content/topics';
import { getAllGroups } from '@/lib/content/topicsData';
import { fetchTopicFlagIds } from '@/lib/db/shortlistServer';
import { TopicOverview } from '@/features/topic-view';

interface Props {
  params: Promise<{ topic: string }>;
}

export default async function Page({ params }: Props) {
  const { topic } = await params;

  const [groups, flagIds] = await Promise.all([
    getAllGroups(),
    fetchTopicFlagIds(topic),
  ]);

  const group = findGroup(groups, topic);
  if (!group) notFound();

  return <TopicOverview slug={group.slug} flagIds={flagIds} />;
}

// Deliberately no generateStaticParams(): everything is per-account now, and
// getAllGroups() reads cookies() (via createClient()). Exporting it — even
// returning [] — opts this route into static generation, and unlisted paths
// are then generated on demand *statically*, so cookies() throws
// DYNAMIC_SERVER_USAGE and every page 500s. Without it the route is
// server-rendered per request, which is what we want.
