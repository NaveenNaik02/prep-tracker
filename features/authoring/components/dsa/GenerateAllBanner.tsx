'use client';

import { GenerateButton } from '@/components/GenerateButton';
import {
  bulkFieldsFor,
  selectAnyBusy,
  selectHasTitle,
  useDsa,
  useFieldError,
} from '../../store/dsa/dsaStore';
import { FormField } from './FormField';

// Whole-form action, so it sits above the fields rather than in one field's
// label row where every per-field Generate lives.
export const GenerateAllBanner = () => {
  const isEditing = useDsa((s) => s.isEditing);
  const loading = useDsa((s) => s.busy === 'all');
  const hasTitle = useDsa(selectHasTitle);
  const anyBusy = useDsa(selectAnyBusy);
  const draftFields = useDsa((s) => s.draftFields);
  const error = useFieldError('all');
  const lead = isEditing ? 'Description' : 'Subtopic, description';
  return (
    <FormField error={error}>
      <div className="aq-generate-all">
        <div className="aq-impl-toggle-copy">
          <span className="aq-impl-toggle-title">
            Fill the form from the question header
          </span>
          <span className="aq-impl-toggle-sub">
            {lead}, prerequisites, solution, output, explanation and difficulty
            — one request.
          </span>
        </div>
        <GenerateButton
          loading={loading}
          disabled={!hasTitle || anyBusy}
          label="Generate all"
          title={
            hasTitle
              ? 'Fill every field below from the question header, in one request'
              : 'Add a question header first'
          }
          onClick={() => draftFields(bulkFieldsFor(isEditing))}
        />
      </div>
    </FormField>
  );
};
