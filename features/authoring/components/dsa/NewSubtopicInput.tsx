'use client';

import { useState } from 'react';
import { useDsa } from '../../store/dsa/dsaStore';

export const NewSubtopicInput = ({ onClose }: { onClose: () => void }) => {
  const stageOrSelect = useDsa((s) => s.stageOrSelect);
  const [name, setName] = useState('');
  const canAdd = !!name.trim();

  const add = () => {
    if (!canAdd) return;
    stageOrSelect(name);
    onClose();
  };

  return (
    <div className="aq-inline">
      <input
        className="aq-input"
        type="text"
        autoFocus
        placeholder="New subtopic name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
          // Closes the input, not the whole modal.
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      />
      <button type="button" className="btn-cancel" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="btn-save btn-primary"
        disabled={!canAdd}
        onClick={add}
      >
        Add
      </button>
    </div>
  );
};
