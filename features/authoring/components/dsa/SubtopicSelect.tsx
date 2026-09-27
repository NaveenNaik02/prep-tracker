'use client';

import AqSelect from '@/components/AqSelect';
import { sectionUrl } from '@/lib/content/topics';
import { STAGED } from '../../store/dsa/placementSlice';
import { useDsa, usePlacementView } from '../../store/dsa/dsaStore';

// Any string that can't collide with a real section url or STAGED.
const NEW_SUBTOPIC = 'new:typed';

export const SubtopicSelect = ({ onNew }: { onNew: () => void }) => {
  const { choices } = usePlacementView();
  const stagedLabel = useDsa((s) => s.stagedLabel);
  const targetUrl = useDsa((s) => s.targetUrl);
  const setTargetUrl = useDsa((s) => s.setTargetUrl);

  const existing = choices.map((c) => ({
    value: sectionUrl(c),
    label: c.label,
  }));
  const staged = stagedLabel
    ? [{ value: STAGED, label: `${stagedLabel} — new` }]
    : [];
  const options = [
    ...existing,
    ...staged,
    { value: NEW_SUBTOPIC, label: '+ New subtopic…' },
  ];

  return (
    <AqSelect
      id="dq-section"
      value={targetUrl}
      onChange={(v) => {
        if (v === NEW_SUBTOPIC) onNew();
        else setTargetUrl(v);
      }}
      options={options}
    />
  );
};
