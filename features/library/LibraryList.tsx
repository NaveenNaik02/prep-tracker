import { ExternalLink } from 'lucide-react';
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { LibTag } from './components/LibTag';
import { libBlurb, type LibraryEntry } from './types';

// Server component: the cards are links, so nothing here needs the client.
// Adding and editing entries is where the client code lives.
export const LibraryList = ({ entries }: { entries: LibraryEntry[] }) => {
  if (entries.length === 0) {
    return (
      <div className="empty-set">
        <div className="es-title">Nothing saved yet</div>
        <div className="es-sub">
          Use &quot;Add to Library&quot; above to save an algorithm write-up, a
          pattern or a note you&apos;ll want to read again later.
        </div>
      </div>
    );
  }

  return (
    <div className="lib-grid">
      {entries.map((entry) => (
        // The standalone link can't nest inside the card's own link, so the
        // card is a plain box with two links in it — the main one stretched
        // over the whole card by CSS.
        <div className="lib-card" key={entry.id}>
          <HoverPrefetchLink
            href={`/library/${entry.id}`}
            className="lib-card-main"
          >
            <LibTag type={entry.type} />
            <div className="lib-card-title">{entry.title}</div>
            <p className="lib-card-blurb">{libBlurb(entry.content)}</p>
          </HoverPrefetchLink>
          <a
            className="lib-card-open"
            href={`/read/${entry.shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open as standalone page"
            aria-label={`Open ${entry.title} as standalone page`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      ))}
    </div>
  );
};
