// Mirrors the Library pages so the swap to real content doesn't move
// anything: the icon + title header with its CTA, then the card grid, and
// for an entry the tag/title/body stack.
export const LibrarySkeleton = () => {
  return (
    <div className="content-wrapper animate-pulse">
      <div className="ic-page-head" style={{ marginBottom: 'var(--s-5)' }}>
        <div>
          <div className="my-1 h-8 w-44 rounded bg-[var(--bg-soft)]" />
          <div className="h-4 w-40 rounded bg-[var(--bg-soft)]" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-[var(--bg-soft)]" />
      </div>

      <div className="lib-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="lib-card">
            <div className="lib-card-main">
              <span className="h-4 w-20 rounded bg-[var(--bg-hover)]" />
              <div className="h-5 w-40 rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--bg-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LibraryArticleSkeleton = () => {
  return (
    <div className="content-wrapper lib-article animate-pulse">
      <div className="back-link h-4 w-20 rounded bg-[var(--bg-soft)]" />
      <div className="lib-article-head">
        <div>
          <div className="h-4 w-20 rounded bg-[var(--bg-soft)]" />
          <div className="mt-2 h-8 w-64 max-w-full rounded bg-[var(--bg-soft)]" />
        </div>
        <div className="lib-article-actions">
          {[36, 20, 24].map((w, i) => (
            <span
              key={i}
              className="h-[34px] rounded-full bg-[var(--bg-soft)]"
              style={{ width: `${w * 3}px` }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {['100%', '92%', '96%', '60%', '88%', '74%'].map((w, i) => (
          <div
            key={i}
            className="h-4 rounded bg-[var(--bg-soft)]"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
};
