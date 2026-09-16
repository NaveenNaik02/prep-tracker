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
