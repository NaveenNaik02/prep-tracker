import { notFound } from 'next/navigation';
import { findSection, findGroupForSection } from '@/lib/content/topics';
import { getAllGroups } from '@/lib/content/topicsData';
import { parseSection } from '@/lib/content/parser';
import { fetchSectionOrder } from '@/lib/db/questionPositionServer';
import { SectionClient } from '@/features/section-view';

interface Props {
  params: Promise<{ topic: string; file: string }>;
}

export default async function Page({ params }: Props) {
  const { topic, file } = await params;

  const [groups, questions, initialOrder] = await Promise.all([
    getAllGroups(),
    parseSection({ topic, file }),
    fetchSectionOrder({ topic, file }),
  ]);

  const section = findSection(groups, [topic, file]);
  if (!section) notFound();

  const group = findGroupForSection(groups, section);
  if (!group) notFound();

  return (
    <SectionClient
      section={section}
      questions={questions}
      initialOrder={initialOrder}
    />
  );
}
