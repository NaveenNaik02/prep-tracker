'use client';

import { useState } from 'react';
import MarkdownField from '@/components/MarkdownField';
import { getSavedModel } from '@/lib/ai/models';
import { getDescriptionInstructionText } from '@/lib/instructionPresets';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import { DraftChips } from '../DraftChips';
import { FieldGenerateButton } from './FieldGenerateButton';
import { FormatButton } from './FormatButton';
import { FormField } from './FormField';
import { InstructionsButton } from './InstructionsButton';
import {
  selectAnyBusy,
  useDsa,
  useDsaApi,
  useFieldError,
} from '../../store/dsa/dsaStore';

const PLACEHOLDER =
  'Given a string `s`, find the length of the longest substring without repeating characters.';

export const DescriptionField = () => {
  const store = useDsaApi();
  const problem = useDsa((s) => s.problem);
  const editProblem = useDsa((s) => s.editProblem);
  const drafts = useDsa((s) => s.descDrafts);
  const selectDraft = useDsa((s) => s.selectDraft);
  const generating = useDsa((s) => s.busy === 'description');
  const anyBusy = useDsa(selectAnyBusy);
  const error = useFieldError('description');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  // Its own preset, not the explanation's and not the implementation
  // 'problem' one — that asks for 1-3 sentences, which strips worked examples.
  const [instructions, setInstructions] = useState(
    getDescriptionInstructionText,
  );

  // Format rewrites the description in place, so it parks the old text as a
  // draft first — same contract as the explanation's.
  const format = () => {
    const { run, title, lang, setProblem, keepDraft } = store.getState();
    return run('description', async () => {
      keepDraft('descDrafts', problem, false);
      const text = (
        await formatAnswer({
          text: problem,
          question: title,
          lang,
          isDescription: true,
          instructions,
          model: getSavedModel(),
        })
      ).trim();
      setProblem(text);
      keepDraft('descDrafts', text, true);
    });
  };

  return (
    <FormField
      label={
        <>
          Description <span className="aq-customize-sub">(Markdown)</span>
        </>
      }
    >
      <MarkdownField
        tab={tab}
        onTabChange={setTab}
        value={problem}
        onChange={editProblem}
        readOnly={generating}
        textareaClassName={generating ? 'aq-gen-active' : ''}
        placeholder={PLACEHOLDER}
        emptyPreviewText="Live preview appears here as you type…"
        toolbar={
          <div className="aq-gen-controls">
            <InstructionsButton
              value={instructions}
              kind="description"
              onChange={setInstructions}
            />
            <FormatButton text={problem} noun="description" onClick={format} />
            <FieldGenerateButton
              field="description"
              hasValue={!!problem.trim()}
            />
          </div>
        }
        belowTabs={
          <>
            <DraftChips
              versions={drafts.versions}
              activeId={drafts.activeId}
              disabled={anyBusy}
              onSelect={(v) => selectDraft('descDrafts', v)}
            />
            {error && <div className="aq-gen-error">{error}</div>}
          </>
        }
      />
    </FormField>
  );
};
