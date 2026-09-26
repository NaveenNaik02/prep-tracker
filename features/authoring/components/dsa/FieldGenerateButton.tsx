'use client';

import { GenerateButton } from '@/components/GenerateButton';
import type { DsaField } from '@/lib/ai/dsaFields';
import {
  selectAnyBusy,
  selectHasTitle,
  useDsa,
} from '../../store/dsa/dsaStore';

interface Props {
  field: DsaField;
  hasValue: boolean;
  // Fields derived from this one — they come back in the same request, not a
  // second one.
  also?: DsaField[];
}

// Every per-field Generate is the same button over a different key, and they
// all need a header to work from.
export const FieldGenerateButton = ({ field, hasValue, also = [] }: Props) => {
  const busy = useDsa((s) => s.busy);
  const hasTitle = useDsa(selectHasTitle);
  const anyBusy = useDsa(selectAnyBusy);
  const draftFields = useDsa((s) => s.draftFields);
  const what = also.length
    ? `this field and the ${also.join(', ')}`
    : 'this field';
  return (
    <GenerateButton
      loading={busy === field}
      hasValue={hasValue}
      disabled={!hasTitle || anyBusy}
      title={hasTitle ? `Generate ${what}` : 'Add a question header first'}
      onClick={() => draftFields([field, ...also], field)}
    />
  );
};
