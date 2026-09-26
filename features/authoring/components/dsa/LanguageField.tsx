'use client';

import { useDsa } from '../../store/dsa/dsaStore';
import { AqCombo } from '../AqCombo';
import { LANG_OPTIONS } from '../../types';
import { FormField } from './FormField';

// Typed as well as picked: the generated solution is written in whatever is
// here, so it can't be limited to a fixed list.
export const LanguageField = () => {
  const lang = useDsa((s) => s.lang);
  const setLang = useDsa((s) => s.setLang);
  return (
    <FormField
      htmlFor="dq-lang"
      label={
        <>
          Language{' '}
          <span className="aq-customize-sub">(pick one or type your own)</span>
        </>
      }
    >
      <AqCombo
        id="dq-lang"
        value={lang}
        onChange={setLang}
        options={LANG_OPTIONS}
        placeholder="js"
      />
    </FormField>
  );
};
