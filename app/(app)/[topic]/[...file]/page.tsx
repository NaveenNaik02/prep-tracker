import { notFound } from 'next/navigation';
import {
  findSection,
  findGroupForSection,
  sectionPath,
} from '@/lib/content/topics';
import { getAllGroups } from '@/lib/content/topicsData';
import { parseSection } from '@/lib/content/parser';
import { fetchSectionOrder } from '@/lib/db/questionPositionServer';
import { SectionClient } from '@/features/section-view';

interface Props {
  // A catch-all, not a single segment: `SectionMeta.topic` may itself be a
  // path ("react/ecosystem"), so sectionUrl() emits three segments for
  // ETL-era content. A fixed [file] matched only two and 404'd the rest.
  params: Promise<{ topic: string; file: string[] }>;
}

export default async function Page({ params }: Props) {
  const { topic, file } = await params;
  // sectionPath already splits a segment list the right way round — the last
  // one is the file, everything before it is the topic.
  const target = sectionPath([topic, ...file]);

  const [groups, questions, initialOrder] = await Promise.all([
    getAllGroups(),
    parseSection(target),
    fetchSectionOrder(target),
  ]);

  const section = findSection(groups, [topic, ...file]);
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

// Deliberately no generateStaticParams(): everything is per-account, and
// getAllGroups() reads cookies() via createClient(). Exporting it — even
// returning [] — opts this route into static generation, and unlisted paths
// are then generated on demand *statically*, so cookies() throws
// DYNAMIC_SERVER_USAGE and every page 500s.
