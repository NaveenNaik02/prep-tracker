'use client';

import { useDsa, usePlacementView } from '../../store/dsa/dsaStore';
import { SuggestionCard } from '../SuggestionCard';

export const SubtopicSuggestion = () => {
  const { group, choices } = usePlacementView();
  const history = useDsa((s) => s.history);
  const at = useDsa((s) => s.at);
  const accept = useDsa((s) => s.accept);
  const reject = useDsa((s) => s.reject);
  const back = useDsa((s) => s.back);
  const dismiss = useDsa((s) => s.dismiss);
  const suggestion = history[at];
  if (!suggestion) return null;

  const isNew = suggestion.mode !== 'existing';
  const labelOf = (s: typeof suggestion) => {
    if (s.mode !== 'existing') return s.label;
    return choices.find((c) => c.topic === s.topic && c.file === s.file)?.label;
  };
  const label = labelOf(suggestion);

  return (
    <SuggestionCard
      path={
        <>
          <b>{group?.groupName}</b>
          {' → '}
          <b>{label}</b>
          {isNew && <span className="aq-suggest-badge">new subtopic</span>}
        </>
      }
      reasoning={suggestion.reasoning}
      at={at}
      total={history.length}
      onDismiss={dismiss}
      onBack={back}
      onReject={reject}
      onAccept={accept}
    />
  );
};
