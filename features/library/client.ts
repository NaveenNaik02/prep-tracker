'use client';

// Client-safe entry for this feature. The main barrel re-exports
// db/dbServer.ts, which is `server-only` and cannot be pulled into a client
// bundle — so client components import the Library's client surface here
// instead of reaching for individual modules.
export { listLibraryConcepts } from './actions/library';
export type { LibraryConcept } from './actions/library';
export { useLibraryConcepts } from './useLibraryConcepts';
