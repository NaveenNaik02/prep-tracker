'use client';

import { useState } from 'react';
import { GenerateButton } from '@/components/GenerateButton';
import {
  selectAnyBusy,
  selectHasTitle,
  useDsa,
  useFieldError,
  usePlacementView,
} from '../../store/dsa/dsaStore';
import { FormField } from './FormField';
import { NewSubtopicInput } from './NewSubtopicInput';
import { SubtopicSelect } from './SubtopicSelect';
import { SubtopicSuggestion } from './SubtopicSuggestion';

export const SubtopicField = () => {
  const { group } = usePlacementView();
  const loading = useDsa((s) => s.busy === 'section');
  const hasTitle = useDsa(selectHasTitle);
  const anyBusy = useDsa(selectAnyBusy);
  const suggest = useDsa((s) => s.suggest);
  const error = useFieldError('section');
  const [adding, setAdding] = useState(false);

  return (
    <FormField
      htmlFor="dq-section"
      label={
        <>
          Subtopic{' '}
          <span className="aq-customize-sub">in {group?.groupName}</span>
        </>
      }
      action={
        <GenerateButton
          loading={loading}
          disabled={!hasTitle || anyBusy}
          label="Suggest placement"
          loadingLabel="Thinking…"
          title={
            hasTitle
              ? 'Suggest which subtopic this question belongs in'
              : 'Add a question header first'
          }
          onClick={suggest}
        />
      }
      error={error}
    >
      {adding ? (
        <NewSubtopicInput onClose={() => setAdding(false)} />
      ) : (
        <SubtopicSelect onNew={() => setAdding(true)} />
      )}
      <SubtopicSuggestion />
    </FormField>
  );
};
