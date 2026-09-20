import { notFound } from 'next/navigation';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { LibTag, fetchSharedEntry } from '@/features/library';

interface Props {
  params: Promise<{ token: string }>;
}

// Nothing here reads cookies, so this page is prerendered per token and only
// re-checked on this interval — unlike every route under (app), which is
// owner-scoped and therefore always dynamic.
export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const entry = await fetchSharedEntry(token);
  // The token is unguessable, but a shared link can still end up somewhere
  // public — being crawlable is not part of the deal.
  return {
    title: entry ? entry.title : 'Not found',
    robots: { index: false, follow: false },
  };
}

export default async function SharedEntryPage({ params }: Props) {
  const { token } = await params;
  const entry = await fetchSharedEntry(token);
  if (!entry) notFound();

  return (
    <main className="read-page">
      <LibTag type={entry.type} />
      <h1 className="read-title">{entry.title}</h1>
      <div
        className="q-body prose prose-slate dark:prose-invert max-w-none read-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
      />
    </main>
  );
}
