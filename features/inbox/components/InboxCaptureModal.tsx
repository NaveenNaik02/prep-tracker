'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Inbox, Loader2, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { unwrap } from '@/lib/ai/result';
import { addInboxItem, addInboxItems, splitInboxText } from '../actions';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

type AiState = 'idle' | 'loading' | 'done' | 'error';

// Deliberately has NO topic/subtopic fields — the whole point is
// zero-friction capture. Sorting happens later, from the Inbox page.
// "Split with AI" is optional and gated to signed-in users (it burns the
// shared Gemini key), unlike the plain save which stays anonymous-friendly.
export default function InboxCaptureModal({ onClose, onSaved }: Props) {
  const { user, mounted, appendInboxItem, appendInboxItems } = useAppStore(
    useShallow((s) => ({
      user: s.user,
      mounted: s.mounted,
      appendInboxItem: s.appendInboxItem,
      appendInboxItems: s.appendInboxItems,
    })),
  );
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiState, setAiState] = useState<AiState>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string[]>([]);
  const [removedIdx, setRemovedIdx] = useState<Set<number>>(new Set());
  const taRef = useRef<HTMLTextAreaElement>(null);

  const isAnonymous = mounted && !!user?.is_anonymous;

  useEffect(() => {
    taRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const willSaveMany = aiState === 'done' && detected.length > 1;
  const finalItems = detected.filter((_, i) => !removedIdx.has(i));
  const count = willSaveMany ? finalItems.length : 1;
  const canSave =
    (willSaveMany ? finalItems.length > 0 : text.trim().length > 3) && !saving;

  // Editing after a split invalidates it — done inline (not as an effect
  // keyed on `text`) so a stale split is only cleared on the rare edit that
  // follows one, instead of firing 4 setStates on every keystroke.
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (aiState !== 'idle') {
      setAiState('idle');
      setAiError(null);
      setDetected([]);
      setRemovedIdx(new Set());
    }
  };

  const runSplit = async () => {
    setAiState('loading');
    setAiError(null);
    try {
      const qs = unwrap(await splitInboxText(text));
      setDetected(qs);
      setAiState('done');
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Could not split that — try again.',
      );
      setAiState('error');
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (willSaveMany) {
        const items = await addInboxItems(finalItems);
        appendInboxItems(items);
      } else {
        const item = await addInboxItem(text);
        appendInboxItem(item);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save — try again.',
      );
      setSaving(false);
    }
  };

  return (
    <div className="modal-scrim">
      <div
        className="aq-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Save for later"
      >
        <div className="aq-head">
          <h2>Save for later</h2>
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
          <div className="aq-field">
            <label htmlFor="ic-text">
              Question(s){' '}
              <span className="aq-customize-sub">
                (paste one, or several at once)
              </span>
            </label>
            <textarea
              id="ic-text"
              ref={taRef}
              className="aq-input aq-problem-input"
              rows={7}
              placeholder="Paste or jot down the question here — no need to sort it yet."
              value={text}
              onChange={handleTextChange}
            />
          </div>

          {!isAnonymous && text.trim().length > 3 && (
            <div className="split-toggle">
              <div className="split-toggle-text">
                {aiState === 'done' && detected.length > 1 && (
                  <span>
                    Found <b>{detected.length} separate questions</b> in this
                    paste.
                  </span>
                )}
                {aiState === 'done' && detected.length <= 1 && (
                  <span>Looks like a single question — nothing to split.</span>
                )}
                {aiState === 'idle' && (
                  <span>
                    Pasted more than one question? Let AI pull them apart.
                  </span>
                )}
                {aiState === 'error' && (
                  <span>
                    Couldn&apos;t split that — check the paste and try again.
                  </span>
                )}
              </div>
              <button
                type="button"
                className="split-ai-btn"
                onClick={runSplit}
                disabled={aiState === 'loading'}
              >
                {aiState === 'loading' ? (
                  <Loader2 size={13} className="aq-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                {aiState === 'loading' ? 'Splitting…' : 'Split with AI'}
              </button>
            </div>
          )}
          {aiState === 'error' && aiError && (
            <div className="split-error">{aiError}</div>
          )}

          {willSaveMany && (
            <div className="split-preview">
              {detected.map(
                (q, i) =>
                  !removedIdx.has(i) && (
                    <div className="split-item" key={i}>
                      <span className="split-item-num">
                        {String(finalItems.indexOf(q) + 1).padStart(2, '0')}
                      </span>
                      <span className="split-item-text">{q}</span>
                      <button
                        type="button"
                        className="split-item-remove"
                        aria-label="Remove from batch"
                        onClick={() =>
                          setRemovedIdx((prev) => new Set(prev).add(i))
                        }
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ),
              )}
            </div>
          )}

          {error && <div className="aq-gen-error">{error}</div>}
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left">
            <Inbox size={13} />
            Goes straight to your Inbox — pick a topic later, whenever
            you&apos;re ready.
          </span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn-primary btn-save ${saving ? 'saving' : ''}`}
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving ? <Loader2 size={14} className="aq-spin" /> : null}
              {saving
                ? 'Saving…'
                : count > 1
                  ? `Save ${count} questions to Inbox`
                  : 'Save to Inbox'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
