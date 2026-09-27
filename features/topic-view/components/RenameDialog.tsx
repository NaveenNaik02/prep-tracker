'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTypewriter } from '@/lib/hooks';
import { generateTopicBlurb } from '@/lib/ai/generateBlurb';
import { unwrap } from '@/lib/ai/result';

interface Props {
  title: string;
  label: string;
  initialName: string;
  // Only the topic modal has a blurb — omitted for subtopics, which have no
  // such column. `undefined` means "don't render the field".
  initialBlurb?: string;
  onSave: (name: string, blurb: string) => Promise<void>;
  onClose: () => void;
}

export const RenameDialog = ({
  title,
  label,
  initialName,
  initialBlurb,
  onSave,
  onClose,
}: Props) => {
  const [name, setName] = useState(initialName);
  const [blurb, setBlurb] = useState(initialBlurb ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blurbGen, setBlurbGen] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const typewriteBlurb = useTypewriter(setBlurb);

  // Generates from the name currently in the field, not the saved one, so
  // renaming and regenerating the description in one pass works.
  const canGenerateBlurb = name.trim().length > 1 && blurbGen !== 'loading';
  const generateBlurb = async () => {
    if (!canGenerateBlurb) return;
    setBlurbGen('loading');
    try {
      typewriteBlurb(unwrap(await generateTopicBlurb(name)));
      setBlurbGen('idle');
    } catch {
      setBlurbGen('error');
    }
  };

  const unchanged =
    name.trim() === initialName &&
    (initialBlurb === undefined || blurb.trim() === (initialBlurb ?? ''));
  const canSave = name.trim().length >= 2 && !saving && !unchanged;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), blurb.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename.');
      setSaving(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rename-title" className="confirm-title">
          {title}
        </h2>
        <div className="confirm-field">
          <label className="confirm-label" htmlFor="rename-name">
            {label}
          </label>
          <input
            id="rename-name"
            type="text"
            className="confirm-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            autoFocus
            autoComplete="off"
          />
        </div>
        {initialBlurb !== undefined && (
          <div className="confirm-field">
            <div className="aq-label-row">
              <label className="confirm-label" htmlFor="rename-blurb">
                Description
              </label>
              <button
                type="button"
                className={`aq-generate-btn ${blurbGen === 'loading' ? 'loading' : ''}`}
                onClick={generateBlurb}
                disabled={!canGenerateBlurb}
                title={
                  canGenerateBlurb
                    ? 'Generate a description from the topic name'
                    : 'Add a topic name first'
                }
              >
                {blurbGen === 'loading' ? (
                  <>
                    <span className="aq-gen-spinner" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={12.5} /> Generate
                  </>
                )}
              </button>
            </div>
            <input
              id="rename-blurb"
              type="text"
              className="confirm-input"
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              autoComplete="off"
            />
            {blurbGen === 'error' && (
              <p className="confirm-error">
                Couldn&apos;t generate — try again.
              </p>
            )}
          </div>
        )}
        {error && <p className="confirm-error">{error}</p>}
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
