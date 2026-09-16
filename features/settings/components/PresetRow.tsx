'use client';

import { Lock, Pencil, Trash2 } from 'lucide-react';
import type { InstructionPreset } from '@/lib/instructionPresets';

const KIND_LABEL = {
  text: 'Explanation default',
  code: 'Code default',
  suggestion: 'Suggestion default',
  problem: 'Problem default',
  'code-explanation': 'Code explanation default',
  description: 'Description default',
} as const;

const PresetRow = ({
  preset: p,
  canDelete,
  onEdit,
  onDelete,
}: {
  preset: InstructionPreset;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const kindLabel = p.kind && KIND_LABEL[p.kind];

  return (
    <div className="instr-preset-row">
      <div className="instr-preset-text">
        <div className="instr-preset-name">
          {p.protected && <Lock size={12} aria-label="Can't be deleted" />}
          <span className="instr-preset-name-text">{p.name}</span>
          {kindLabel && (
            <span className="instr-preset-tag" title={kindLabel}>
              {kindLabel}
            </span>
          )}
        </div>
        <div className="instr-preset-preview">
          {p.text.trim() ||
            'No formatting preferences — uses the base prompt only.'}
        </div>
      </div>
      <div className="instr-preset-actions">
        <button
          type="button"
          className="instr-preset-btn"
          title="Edit"
          aria-label={`Edit ${p.name}`}
          onClick={onEdit}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          className="instr-preset-btn danger"
          title={p.protected ? "This default can't be deleted" : 'Delete'}
          aria-label={`Delete ${p.name}`}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export default PresetRow;
