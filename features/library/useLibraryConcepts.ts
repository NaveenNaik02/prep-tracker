'use client';

import { useEffect, useState } from 'react';
import { listLibraryConcepts, type LibraryConcept } from './actions/library';

// The caller's saved Library entries, for matching prerequisite names against.
// ponytail: refetched per mount — it's a two-column select over one user's
// rows; cache it in the app store if a page ever mounts this many times.
export function useLibraryConcepts(enabled = true): LibraryConcept[] {
  const [concepts, setConcepts] = useState<LibraryConcept[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listLibraryConcepts()
      .then((rows) => {
        if (!cancelled) setConcepts(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return concepts;
}
