'use client';

import { useEffect, useState } from 'react';
import { X, AlignLeft } from 'lucide-react';
import AqSelect from '@/components/AqSelect';
import { getSavedModel } from '@/lib/ai/models';
import MarkdownField from '@/components/MarkdownField';
import { GenerateButton } from '@/components/GenerateButton';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import {
  generateLibraryEntry,
  suggestLibraryTitle,
} from '@/lib/ai/generateLibraryEntry';
import { useTypewriter } from '@/lib/hooks';
import { LIB_TYPES, type LibraryEntry, type LibraryType } from '../types';
import type { LibraryEntryInput } from '../actions/library';

interface Props {
  entry?: LibraryEntry;
  onClose: () => void;
  onSave: (input: LibraryEntryInput) => Promise<void>;
}

export const LibraryModal = ({ entry, onClose, onSave }: Props) => {
  const [type, setType] = useState<LibraryType>(entry?.type ?? 'algorithm');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [titleGen, setTitleGen] = useState(false);
  const [contentGen, setContentGen] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typewriteContent = useTypewriter(setContent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasTitle = title.trim().length > 1;
  const hasContent = content.trim().length > 3;
  const canSave = hasTitle && hasContent && !saving;
  const typeLabel = LIB_TYPES.find((t) => t.value === type)?.label ?? 'entry';

  // One handler for all three AI buttons: each is a run that produces text
  // for a field, so they share the pending flag and error reporting.
  const runAi = async (
    setPending: (v: boolean) => void,
    run: () => Promise<void>,
  ) => {
    setPending(true);
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work — try again.');
    }
    setPending(false);
  };

  const handleGenerateTitle = () => {
    return runAi(setTitleGen, async () => {
      setTitle(await suggestLibraryTitle({ type, title, content }));
    });
  };

  const handleGenerateContent = () => {
    return runAi(setContentGen, async () => {
      const text = await generateLibraryEntry({
        type,
        title,
        model: getSavedModel(),
      });
      setTab('write');
      typewriteContent(text);
    });
  };

  const handleFormat = () => {
    return runAi(setFormatting, async () => {
      const text = await formatAnswer({
        text: content,
        question: title,
        model: getSavedModel(),
      });
      setTab('write');
      setContent(text);
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ type, title, content });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-scrim">
      <div
        className="aq-modal"
        role="dialog"
        aria-modal="true"
        aria-label={entry ? 'Edit library entry' : 'Add to Library'}
      >
        <div className="aq-head">
          <h2>{entry ? 'Edit entry' : 'Add to Library'}</h2>
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
            <label htmlFor="lib-type">Type</label>
            <AqSelect
              id="lib-type"
              value={type}
              onChange={(v) => setType(v as LibraryType)}
              options={LIB_TYPES}
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="lib-title">Title</label>
              <GenerateButton
                loading={titleGen}
                hasValue={!!title.trim()}
                title="Suggest a title"
                onClick={handleGenerateTitle}
              />
            </div>
            <input
              id="lib-title"
              type="text"
              className="aq-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Binary Search"
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label>Content (Markdown)</label>
              <GenerateButton
                loading={contentGen}
                hasValue={!!content.trim()}
                disabled={!hasTitle}
                title={
                  hasTitle
                    ? `Write this ${typeLabel.toLowerCase()} from the title above`
                    : 'Add a title above first'
                }
                onClick={handleGenerateContent}
              />
            </div>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={content}
              onChange={setContent}
              placeholder="Write in Markdown, or click Generate above…"
              emptyPreviewText="Preview appears here as you type…"
              toolbar={
                <button
                  type="button"
                  className="aq-format-btn"
                  disabled={!hasContent || formatting}
                  title={
                    hasContent
                      ? 'Reformat what you wrote into clean Markdown — keeps your content as-is'
                      : 'Write or paste content below first'
                  }
                  onClick={handleFormat}
                >
                  {formatting ? (
                    <span className="aq-gen-spinner" />
                  ) : (
                    <AlignLeft size={13} />
                  )}
                  Format
                </button>
              }
            />
          </div>

          {error && <div className="aq-gen-error">{error}</div>}
        </div>

        <div className="aq-foot">
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn-primary btn-save ${saving ? 'saving' : ''}`}
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
