'use client';

import { useState } from 'react';
import MarkdownField from '@/components/MarkdownField';
import { GenerateButton } from '@/components/GenerateButton';
import { useTypewriter } from '@/lib/hooks';
import { getSavedModel } from '@/lib/ai/models';
import { getCodeExplanationInstructionText } from '@/lib/instructionPresets';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import { generateDsaExplanation } from '@/lib/ai/generateCodeOutput';
import { DraftChips } from '../DraftChips';
import { FormatButton } from './FormatButton';
import { FormField } from './FormField';
import { InstructionsButton } from './InstructionsButton';
import {
  selectAnyBusy,
  selectHasCode,
  useDsa,
  useDsaApi,
  useFieldError,
} from '../../store/dsa/dsaStore';

export const ExplanationField = () => {
  const store = useDsaApi();
  const explain = useDsa((s) => s.explain);
  const setExplain = useDsa((s) => s.setExplain);
  const editExplain = useDsa((s) => s.editExplain);
  const drafts = useDsa((s) => s.explainDrafts);
  const selectDraft = useDsa((s) => s.selectDraft);
  const hasCode = useDsa(selectHasCode);
  const busy = useDsa((s) => s.busy);
  const anyBusy = useDsa(selectAnyBusy);
  const streaming = useDsa((s) => s.streaming);
  const error = useFieldError('explanation');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [instructions, setInstructions] = useState(
    getCodeExplanationInstructionText,
  );
  const typeExplain = useTypewriter(setExplain);
  const generating = busy === 'explanation' || streaming;

  // Both Format and Generate replace the text, so the old one is parked as a
  // draft first and the new one typed in.
  const runExplain = (generate: () => Promise<string>) => {
    const { run, keepDraft, setStreaming } = store.getState();
    return run('explanation', async () => {
      keepDraft('explainDrafts', explain, false);
      const text = (await generate()).trim();
      keepDraft('explainDrafts', text, true);
      setStreaming(true);
      typeExplain(text, () => setStreaming(false));
    });
  };

  const format = () => {
    const { title, lang } = store.getState();
    return runExplain(() => {
      return formatAnswer({
        text: explain,
        question: title,
        lang,
        instructions,
        model: getSavedModel(),
      });
    });
  };

  const generate = () => {
    const { title, code, lang, output } = store.getState();
    return runExplain(() => {
      return generateDsaExplanation({
        code,
        lang,
        output,
        title,
        instructions,
        model: getSavedModel(),
      });
    });
  };

  return (
    <FormField
      label={
        <>
          Explanation{' '}
          <span className="aq-customize-sub">
            (optional, Markdown — collapsed by default)
          </span>
        </>
      }
    >
      <MarkdownField
        tab={tab}
        onTabChange={setTab}
        value={explain}
        onChange={editExplain}
        readOnly={generating}
        textareaClassName={generating ? 'aq-gen-active' : ''}
        placeholder="Walk through the approach — algorithm name, complexity, why it works. Or click Generate above."
        emptyPreviewText="Live preview appears here as you type…"
        toolbar={
          <div className="aq-gen-controls">
            <InstructionsButton
              value={instructions}
              kind="code-explanation"
              onChange={setInstructions}
            />
            <FormatButton text={explain} noun="explanation" onClick={format} />
            <GenerateButton
              loading={generating}
              hasValue={!!explain.trim()}
              disabled={!hasCode || anyBusy}
              title={
                hasCode
                  ? "Generate an explanation of the solution's approach"
                  : 'Add code above first'
              }
              onClick={generate}
            />
          </div>
        }
        belowTabs={
          <>
            <DraftChips
              versions={drafts.versions}
              activeId={drafts.activeId}
              disabled={anyBusy}
              onSelect={(v) => selectDraft('explainDrafts', v)}
            />
            {error && <div className="aq-gen-error">{error}</div>}
          </>
        }
      />
    </FormField>
  );
};
