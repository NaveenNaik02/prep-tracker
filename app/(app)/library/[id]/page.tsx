import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { renderMarkdown } from '@/lib/renderMarkdown';
import {
  LibTag,
  LibraryArticleActions,
  fetchLibraryEntry,
} from '@/features/library';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LibraryArticlePage({ params }: Props) {
  const { id } = await params;
  const entry = await fetchLibraryEntry(id);
  if (!entry) notFound();

  return (
    <div className="content-wrapper lib-article">
      <HoverPrefetchLink href="/library" className="back-link">
        <ChevronLeft size={14} /> Library
      </HoverPrefetchLink>

      <div className="lib-article-head">
        <div>
          <LibTag type={entry.type} />
          <h1 className="lib-article-title">{entry.title}</h1>
        </div>
        <LibraryArticleActions entry={entry} />
      </div>

      <div
        className="q-body prose prose-slate dark:prose-invert max-w-none lib-article-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
      />
    </div>
  );
}
