import { useRef, useState } from 'react';
import { capAnswerVersions } from '../utils/markdownPreview';
import type { AnswerVersion } from '../types';

// Generated text is parked as a draft so Regenerate offers an alternative
// rather than replacing what's there. Editing by hand deselects the chip: the
// text is no longer that draft.
//
// A hook rather than inline state because the DSA form runs two of these — one
// for the description, one for the explanation — and they must not share a
// counter or a selection.
export function useAnswerDrafts(original?: string | null) {
  const [versions, setVersions] = useState<AnswerVersion[]>(() => {
    return original?.trim()
      ? [{ id: 'original', label: 'Original', text: original }]
      : [];
  });
  const [activeId, setActiveId] = useState<string | null>(
    original?.trim() ? 'original' : null,
  );
  const count = useRef(0);

  // Parks `text` before a generate overwrites it, and again once the new text
  // lands, so both are one click apart. `select` is false for the
  // pre-generate snapshot: the field is about to hold the new text, not that one.
  // Deduped against a ref rather than `versions`: callers keep() twice in one
  // tick (park the old text, then the new), and the second call would not see
  // the first in the render closure — which showed up as two identical chips.
  // A ref rather than a check inside the updater, because the updater must
  // stay pure: React can call it twice and the counter would skip.
  const parked = useRef(new Set(original?.trim() ? [original] : []));

  const keep = (text: string, select: boolean) => {
    if (!text.trim() || parked.current.has(text)) return;
    parked.current.add(text);
    count.current += 1;
    // The counter only ever goes up, so this stays unique even after
    // capAnswerVersions has evicted an earlier draft.
    const id = `v${count.current}`;
    const label = `Draft ${count.current}`;
    setVersions((prev) => capAnswerVersions([...prev, { id, label, text }]));
    if (select) setActiveId(id);
  };

  return { versions, activeId, setActiveId, keep };
}
