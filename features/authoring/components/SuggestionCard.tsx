import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  // The "Topic → Subtopic" line — each form words its own, since only the
  // plain form can propose a new topic.
  path: ReactNode;
  reasoning?: string;
  // Position in the suggestions offered so far.
  at: number;
  total: number;
  onDismiss: () => void;
  onBack: () => void;
  onReject: () => void;
  onAccept: () => void;
}

// Previews an AI placement suggestion; nothing changes until it's accepted.
export const SuggestionCard = ({
  path,
  reasoning,
  at,
  total,
  onDismiss,
  onBack,
  onReject,
  onAccept,
}: Props) => {
  return (
    <div className="aq-suggest-card">
      <div className="aq-suggest-path">
        <Sparkles size={13} />
        <span>{path}</span>
      </div>
      {reasoning && <p className="aq-suggest-reason">{reasoning}</p>}
      {total > 1 && (
        <p className="aq-suggest-reason">
          Suggestion {at + 1} of {total}
        </p>
      )}
      <div className="aq-suggest-actions">
        <button type="button" className="btn-cancel" onClick={onDismiss}>
          Choose manually
        </button>
        {at > 0 && (
          <button type="button" className="btn-cancel" onClick={onBack}>
            Back
          </button>
        )}
        <button type="button" className="btn-cancel" onClick={onReject}>
          Not this one
        </button>
        <button type="button" className="btn-primary" onClick={onAccept}>
          Use this placement
        </button>
      </div>
    </div>
  );
};
