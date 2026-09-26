'use client';

import { Loader2 } from 'lucide-react';
import {
  selectHasCode,
  selectHasTitle,
  useDsa,
  usePlacementView,
} from '../../store/dsa/dsaStore';

// Sits at the end of the form body, just above the footer.
export const SaveError = () => {
  const saveError = useDsa((s) => s.saveError);
  return saveError ? <div className="aq-gen-error">{saveError}</div> : null;
};

export const DsaFooter = ({ onClose }: { onClose: () => void }) => {
  const isEditing = useDsa((s) => s.isEditing);
  const saving = useDsa((s) => s.saving);
  const save = useDsa((s) => s.save);
  const hasTitle = useDsa(selectHasTitle);
  const hasCode = useDsa(selectHasCode);
  const hasProblem = useDsa((s) => s.problem.trim().length > 3);
  const { hasTarget } = usePlacementView();
  const canSave = hasTarget && hasTitle && hasProblem && hasCode && !saving;
  const idleLabel = isEditing ? 'Save changes' : 'Save question';

  return (
    <div className="aq-foot">
      <span className="aq-foot-left">
        {isEditing
          ? 'Saving updates this DSA question in place.'
          : 'Saves this DSA question straight to the database.'}
      </span>
      <div className="aq-foot-actions">
        <button className="btn-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          className={`btn-primary btn-save ${saving ? 'saving' : ''}`}
          disabled={!canSave}
          onClick={save}
        >
          {saving ? <Loader2 size={14} className="aq-spin" /> : null}
          {saving ? 'Saving…' : idleLabel}
        </button>
      </div>
    </div>
  );
};
