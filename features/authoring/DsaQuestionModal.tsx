'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DsaStoreProvider } from './store/dsa/DsaStoreProvider';
import { GenerateAllBanner } from './components/dsa/GenerateAllBanner';
import { SubtopicField } from './components/dsa/SubtopicField';
import { TitleField } from './components/dsa/TitleField';
import { DescriptionField } from './components/dsa/DescriptionField';
import { PrerequisitesField } from './components/dsa/PrerequisitesField';
import { LanguageField } from './components/dsa/LanguageField';
import { SolutionField } from './components/dsa/SolutionField';
import { OutputField } from './components/dsa/OutputField';
import { ExplanationField } from './components/dsa/ExplanationField';
import { DifficultyField } from './components/dsa/DifficultyField';
import { DsaFooter, SaveError } from './components/dsa/DsaFooter';
import type { DsaQuestionModalProps } from './types';

// The DSA subtopic's add/edit form, backed by its own per-modal store
// (store/dsa/) rather than the authoring store — no duplicate check, two
// draft histories, and placement that never leaves the current topic.
// `code` plus a non-empty `problem` is what makes the saved row render as one.
//
// Every field can be generated on its own, and "Generate all" fills the whole
// question from its header — both go through generateDsaQuestion, which takes
// the list of fields it should return, so either way it is one request.
export const DsaQuestionModal = ({
  section,
  onClose,
  ...init
}: DsaQuestionModalProps) => {
  const heading = init.editing ? 'Edit DSA question' : 'Add DSA question';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <DsaStoreProvider fixedSection={section} {...init}>
      <div className="modal-scrim">
        <div
          className="aq-modal"
          role="dialog"
          aria-modal="true"
          aria-label={heading}
        >
          <div className="aq-head">
            <h2>{heading}</h2>
            <button
              className="aq-close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="aq-body">
            <GenerateAllBanner />
            <SubtopicField />
            <TitleField />
            <DescriptionField />
            <PrerequisitesField />
            <LanguageField />
            <SolutionField />
            <OutputField />
            <ExplanationField />
            <DifficultyField />
            <SaveError />
          </div>

          <DsaFooter onClose={onClose} />
        </div>
      </div>
    </DsaStoreProvider>
  );
};
