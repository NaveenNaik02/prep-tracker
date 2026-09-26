'use client';

import { GenerateButton } from '@/components/GenerateButton';
import { useTypewriter } from '@/lib/hooks';
import { getSavedModel } from '@/lib/ai/models';
import { generateCodeOutput } from '@/lib/ai/generateCodeOutput';
import { FormField } from './FormField';
import {
  selectAnyBusy,
  selectHasCode,
  useDsa,
  useDsaApi,
  useFieldError,
} from '../../store/dsa/dsaStore';

export const OutputField = () => {
  const store = useDsaApi();
  const output = useDsa((s) => s.output);
  const setOutput = useDsa((s) => s.setOutput);
  const hasCode = useDsa(selectHasCode);
  const busy = useDsa((s) => s.busy);
  const anyBusy = useDsa(selectAnyBusy);
  const streaming = useDsa((s) => s.streaming);
  const error = useFieldError('output');
  const typeOutput = useTypewriter(setOutput);

  // Runs the code the author actually has, rather than drafting an output
  // from the header the way the bulk fill does.
  const generate = () => {
    const { run, code, lang, setStreaming } = store.getState();
    return run('output', async () => {
      const text = (
        await generateCodeOutput({ code, lang, model: getSavedModel() })
      ).trim();
      // `run` clears `busy` the moment this resolves, but the typewriter is
      // still writing — without this the field unlocks mid-stream and a
      // second run races it.
      setStreaming(true);
      typeOutput(text, () => setStreaming(false));
    });
  };

  return (
    <FormField
      htmlFor="dq-output"
      label={
        <>
          Output <span className="aq-customize-sub">(optional)</span>
        </>
      }
      action={
        <GenerateButton
          loading={busy === 'output'}
          hasValue={!!output.trim()}
          disabled={!hasCode || anyBusy}
          title={
            hasCode
              ? 'Run the solution above and generate its output'
              : 'Add code above first'
          }
          onClick={generate}
        />
      }
      error={error}
    >
      <textarea
        id="dq-output"
        className="aq-input aq-problem-input"
        rows={2}
        readOnly={busy === 'output' || streaming}
        placeholder="What the solution prints or returns…"
        value={output}
        onChange={(e) => setOutput(e.target.value)}
      />
    </FormField>
  );
};
