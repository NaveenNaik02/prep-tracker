'use client';

import { GenerateButton } from '@/components/GenerateButton';
import { selectAnyBusy, useDsa, useFieldError } from '../../store/dsa/dsaStore';
import { FormField } from './FormField';

export const TitleField = () => {
  const title = useDsa((s) => s.title);
  const setTitle = useDsa((s) => s.setTitle);
  const loading = useDsa((s) => s.busy === 'title');
  const anyBusy = useDsa(selectAnyBusy);
  const draftFields = useDsa((s) => s.draftFields);
  const error = useFieldError('title');
  return (
    <FormField
      htmlFor="dq-title"
      label="Question header"
      // The only field not generated *from* the header, so it's the only one
      // that doesn't need one to already be there.
      action={
        <GenerateButton
          loading={loading}
          hasValue={!!title.trim()}
          disabled={anyBusy}
          title="Name a problem for this subtopic, or from what's already filled in"
          onClick={() => draftFields(['title'])}
        />
      }
      error={error}
    >
      <input
        id="dq-title"
        className="aq-input"
        type="text"
        autoFocus
        placeholder="e.g. Longest Substring Without Repeating Characters"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </FormField>
  );
};
