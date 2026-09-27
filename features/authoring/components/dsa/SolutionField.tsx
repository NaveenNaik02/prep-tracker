'use client';

import { selectHasCode, useDsa, useFieldError } from '../../store/dsa/dsaStore';
import { FieldGenerateButton } from './FieldGenerateButton';
import { FormField } from './FormField';

export const SolutionField = () => {
  const code = useDsa((s) => s.code);
  const setCode = useDsa((s) => s.setCode);
  const hasCode = useDsa(selectHasCode);
  const error = useFieldError('code');
  return (
    <FormField
      htmlFor="dq-code"
      label="Solution code"
      action={
        <FieldGenerateButton
          field="code"
          hasValue={hasCode}
          also={['output']}
        />
      }
      error={error}
    >
      <textarea
        id="dq-code"
        className="aq-input aq-problem-input"
        rows={9}
        placeholder="Paste the solution code here…"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </FormField>
  );
};
