'use client';

import { useDsa, useFieldError } from '../../store/dsa/dsaStore';
import { PrereqChips } from '../PrereqChips';
import { FieldGenerateButton } from './FieldGenerateButton';
import { FormField } from './FormField';

export const PrerequisitesField = () => {
  const prerequisites = useDsa((s) => s.prerequisites);
  const setPrerequisites = useDsa((s) => s.setPrerequisites);
  const error = useFieldError('prerequisites');
  return (
    <FormField
      htmlFor="dq-prereqs"
      label={
        <>
          Prerequisites{' '}
          <span className="aq-customize-sub">
            (optional — what the solver should already know)
          </span>
        </>
      }
      action={
        <FieldGenerateButton
          field="prerequisites"
          hasValue={!!prerequisites.trim()}
        />
      }
      error={error}
    >
      <PrereqChips value={prerequisites} onChange={setPrerequisites} />
    </FormField>
  );
};
