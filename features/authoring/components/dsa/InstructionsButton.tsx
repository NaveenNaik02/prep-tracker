'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AQ_MODELS, getSavedModel } from '@/lib/ai/models';
import type { InstructionPreset } from '@/lib/instructionPresets';
import InstructionsModal from '../InstructionsModal';

type Props = {
  value: string;
  kind: InstructionPreset['kind'];
  onChange: (v: string) => void;
};

export const InstructionsButton = ({ value, kind, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const hasValue = !!value.trim();
  const modelLabel =
    AQ_MODELS.find((m) => m.id === getSavedModel())?.label ?? '';

  return (
    <>
      <button
        type="button"
        className={`aq-customize-btn ${hasValue ? 'has-value' : ''}`}
        onClick={() => setOpen(true)}
        title={`Instructions — model: ${modelLabel}`}
      >
        <SlidersHorizontal size={14} />
        {hasValue && <span className="aq-customize-dot" />}
      </button>
      {open && (
        <InstructionsModal
          value={value}
          kind={kind}
          onClose={() => setOpen(false)}
          onSave={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
};
