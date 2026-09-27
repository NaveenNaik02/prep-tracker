import { capAnswerVersions } from '../../utils/markdownPreview';
import type { Drafts } from './types';

export const initDrafts = (original?: string | null): Drafts => {
  const has = !!original?.trim();
  return {
    versions: has
      ? [{ id: 'original', label: 'Original', text: original! }]
      : [],
    activeId: has ? 'original' : null,
    parked: has ? [original!] : [],
    count: 0,
  };
};

// Parks `text` before a generate overwrites it, and again once the new text
// lands, so both are one click apart. `select` is false for the pre-generate
// snapshot: the field is about to hold the new text, not that one.
export const keepDraft = (d: Drafts, text: string, select: boolean): Drafts => {
  if (!text.trim() || d.parked.includes(text)) return d;
  // The counter only ever goes up, so ids stay unique even after
  // capAnswerVersions has evicted an earlier draft.
  const count = d.count + 1;
  const id = `v${count}`;
  const versions = capAnswerVersions([
    ...d.versions,
    { id, label: `Draft ${count}`, text },
  ]);
  const activeId = select ? id : d.activeId;
  return { versions, activeId, parked: [...d.parked, text], count };
};
