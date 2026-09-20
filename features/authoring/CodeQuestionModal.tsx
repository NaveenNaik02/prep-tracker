'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  AlignLeft,
} from 'lucide-react';
import AqSelect from '@/components/AqSelect';
import { useAppStore } from '@/lib/stores/appStore';
import { useTypewriter } from '@/lib/hooks';
import { AQ_MODELS, getSavedModel } from '@/lib/ai/models';
import { getCodeExplanationInstructionText } from '@/lib/instructionPresets';
import { addQuestion, updateQuestion } from '@/lib/actions/questions';
import {
  generateCodeOutput,
  generateCodeExplanation,
} from '@/lib/ai/generateCodeOutput';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import { findGroupForSection, sectionUrl } from '@/lib/content/topics';
import MarkdownField from '@/components/MarkdownField';
import InstructionsModal from './components/InstructionsModal';
import { DraftChips } from './components/DraftChips';
import { capAnswerVersions } from './utils/markdownPreview';
import { LANG_OPTIONS, PRIORITY_OPTIONS } from './types';
import type { AnswerVersion, CodeQuestionModalProps } from './types';

type GenState = 'idle' | 'loading' | 'error';

// The code-output subtopic's own add/edit form. Deliberately not on the
// authoring store: there's no placement to pick (the subtopic is fixed), no
// answer-draft history, and no duplicate check — a snippet is either already
// there or it isn't. Output and explanation are both optional; `code` is what
// makes the saved row a code question.
export const CodeQuestionModal = ({
  section,
  editing,
  onClose,
  onSaved,
}: CodeQuestionModalProps) => {
  const groups = useAppStore((s) => s.groups);
  const defaultPriority = useAppStore((s) => s.defaultPriority);
  const group = findGroupForSection(groups, section);
  const count = useAppStore((s) => s.totals[sectionUrl(section)] ?? 0);
  const defaultTitle = `#${count + 1} Code Challenge`;

  const [title, setTitle] = useState(editing?.title ?? defaultTitle);
  const [lang, setLang] = useState(editing?.lang || 'js');
  const [code, setCode] = useState(editing?.code ?? '');
  const [output, setOutput] = useState(editing?.output ?? '');
  const [explain, setExplain] = useState(editing?.markdown ?? '');
  const [priority, setPriority] = useState(
    editing ? editing.priority : defaultPriority,
  );
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outputGen, setOutputGen] = useState<GenState>('idle');
  const [explainGen, setExplainGen] = useState<GenState>('idle');
  // The request resolving isn't the end of a generation — the typewriter is
  // still revealing the text. Without this, regenerating mid-stream snapshots
  // a half-written string as a draft and evicts a real one.
  const [streaming, setStreaming] = useState(false);
  // Per-question draft of the 'code-explanation' preset — edits here never
  // write back to Settings, same as the Answer field's instructions.
  const [instructions, setInstructions] = useState(
    getCodeExplanationInstructionText,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  // Generated explanations are kept so Regenerate offers an alternative
  // rather than replacing what's there. Editing by hand deselects the chip:
  // the text is no longer that draft.
  const [versions, setVersions] = useState<AnswerVersion[]>(() => {
    const original = editing?.markdown?.trim();
    return original
      ? [{ id: 'original', label: 'Original', text: editing!.markdown }]
      : [];
  });
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    editing?.markdown?.trim() ? 'original' : null,
  );
  const draftCount = useRef(0);

  const codeRef = useRef<HTMLTextAreaElement>(null);
  const typeOutput = useTypewriter(setOutput);
  const typeExplain = useTypewriter(setExplain);

  useEffect(() => codeRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canGenerate = code.trim().length > 3;

  // Parks the explanation as a draft before a generate overwrites it, and
  // again once the new text lands, so both are one click apart. `select` is
  // false for the pre-generate snapshot: the field is about to hold the new
  // text, not that one.
  const keepVersion = (text: string, select: boolean) => {
    if (!text.trim() || versions.some((v) => v.text === text)) return;
    draftCount.current += 1;
    const id = `v${Date.now()}`;
    const label = `Draft ${draftCount.current}`;
    setVersions((prev) => capAnswerVersions([...prev, { id, label, text }]));
    if (select) setActiveVersionId(id);
  };
  const canSave = title.trim().length > 3 && code.trim().length > 3 && !saving;
  const busy = explainGen === 'loading' || streaming;
  const canFormat = explain.trim().length > 3 && !busy;

  const runGenerate = async (
    setState: (s: GenState) => void,
    generate: () => Promise<string>,
    type: (text: string) => void,
  ) => {
    setState('loading');
    try {
      type((await generate()).trim());
      setState('idle');
    } catch {
      setState('error');
    }
  };

  // Generate and Format both replace the explanation, so both park the old
  // text as a draft first and stream the new one in.
  const runExplain = (generate: () => Promise<string>) => {
    keepVersion(explain, false);
    runGenerate(setExplainGen, generate, (text) => {
      keepVersion(text, true);
      setStreaming(true);
      typeExplain(text, () => setStreaming(false));
    });
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const input = {
        topic: section.topic,
        file: section.file,
        title: title.trim(),
        markdown: explain.trim(),
        lang,
        code: code.trim(),
        output: output.trim(),
        priority,
      };
      const question = editing
        ? await updateQuestion(editing.id, input)
        : await addQuestion(input);
      onSaved(question, section);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save — try again.',
      );
      setSaving(false);
    }
  };

  const heading = editing ? 'Edit code question' : 'Add code question';

  return (
    <div className="modal-scrim">
      <div
        className="aq-modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="aq-head">
          <h2>{heading}</h2>
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
            <label>Subtopic</label>
            <div className="aq-select aq-select-static">
              {group?.groupName} → {section.label}
            </div>
          </div>

          <div className="aq-field">
            <label htmlFor="cq-title">
              Name{' '}
              <span className="aq-customize-sub">(shown in the header)</span>
            </label>
            <input
              id="cq-title"
              className="aq-input"
              type="text"
              placeholder={defaultTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="aq-field">
            <label htmlFor="cq-code">Code</label>
            <textarea
              id="cq-code"
              ref={codeRef}
              className="aq-input aq-problem-input"
              rows={9}
              placeholder="Paste the code snippet here…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="aq-field">
            <label htmlFor="cq-lang">Language</label>
            <AqSelect
              id="cq-lang"
              value={lang}
              onChange={setLang}
              options={LANG_OPTIONS.map((l) => ({ value: l, label: l }))}
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="cq-output">
                Output{' '}
                <span className="aq-customize-sub">
                  (optional — collapsed by default)
                </span>
              </label>
              <button
                type="button"
                className={`aq-generate-btn ${outputGen === 'loading' ? 'loading' : ''}`}
                disabled={!canGenerate || outputGen === 'loading'}
                title={
                  canGenerate
                    ? 'Run the code above and generate its output'
                    : 'Add code above first'
                }
                onClick={() => {
                  runGenerate(
                    setOutputGen,
                    () =>
                      generateCodeOutput({
                        code,
                        lang,
                        model: getSavedModel(),
                      }),
                    typeOutput,
                  );
                }}
              >
                {outputGen === 'loading' ? (
                  <>
                    <span className="aq-gen-spinner" />
                    Generating…
                  </>
                ) : output.trim() ? (
                  <>
                    <RefreshCw size={12.5} /> Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles size={12.5} /> Generate
                  </>
                )}
              </button>
            </div>
            <textarea
              id="cq-output"
              className="aq-input aq-problem-input"
              rows={2}
              readOnly={outputGen === 'loading'}
              placeholder="What the code prints or returns…"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
            {outputGen === 'error' && (
              <div className="aq-gen-error">
                Couldn&apos;t generate — try again.
              </div>
            )}
          </div>

          <div className="aq-field">
            <label>
              Explanation{' '}
              <span className="aq-customize-sub">
                (optional, Markdown — collapsed by default)
              </span>
            </label>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={explain}
              onChange={(v) => {
                setExplain(v);
                setActiveVersionId(null);
              }}
              readOnly={busy}
              textareaClassName={busy ? 'aq-gen-active' : ''}
              placeholder="Why does it output that? Or click Generate above to draft one."
              emptyPreviewText="Live preview appears here as you type…"
              toolbar={
                <div className="aq-gen-controls">
                  <button
                    type="button"
                    className={`aq-customize-btn ${instructions.trim() ? 'has-value' : ''}`}
                    onClick={() => setShowInstructions(true)}
                    title={`Instructions — model: ${AQ_MODELS.find((m) => m.id === getSavedModel())?.label ?? ''}`}
                  >
                    <SlidersHorizontal size={14} />
                    {instructions.trim() ? (
                      <span className="aq-customize-dot" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="aq-format-btn"
                    disabled={!canFormat}
                    title={
                      canFormat
                        ? "Reformat the explanation below into the app's markdown style — keeps your content as-is"
                        : 'Write or paste an explanation below first'
                    }
                    onClick={() => {
                      runExplain(() => {
                        return formatAnswer({
                          text: explain,
                          question: title,
                          lang,
                          instructions,
                          model: getSavedModel(),
                        });
                      });
                    }}
                  >
                    <AlignLeft size={13} /> Format
                  </button>
                  <button
                    type="button"
                    className={`aq-generate-btn ${busy ? 'loading' : ''}`}
                    disabled={!canGenerate || busy}
                    title={
                      canGenerate
                        ? "Generate an explanation of the code's output"
                        : 'Add code above first'
                    }
                    onClick={() => {
                      runExplain(() => {
                        return generateCodeExplanation({
                          code,
                          lang,
                          output,
                          instructions,
                          model: getSavedModel(),
                        });
                      });
                    }}
                  >
                    {busy ? (
                      <>
                        <span className="aq-gen-spinner" />
                        Generating…
                      </>
                    ) : explain.trim() ? (
                      <>
                        <RefreshCw size={12.5} /> Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles size={12.5} /> Generate
                      </>
                    )}
                  </button>
                </div>
              }
              belowTabs={
                <>
                  <DraftChips
                    versions={versions}
                    activeId={activeVersionId}
                    disabled={busy}
                    onSelect={(v) => {
                      setExplain(v.text);
                      setActiveVersionId(v.id);
                    }}
                  />
                  {explainGen === 'error' && (
                    <div className="aq-gen-error">
                      Couldn&apos;t generate — try again.
                    </div>
                  )}
                </>
              }
            />
          </div>

          <div className="aq-field">
            <label>Priority</label>
            <div className="aq-pills">
              {PRIORITY_OPTIONS.map((o) => (
                <button
                  key={o.level}
                  type="button"
                  className={`aq-pill ${o.level} ${priority === o.level ? 'on' : ''}`}
                  onClick={() => {
                    setPriority(priority === o.level ? null : o.level);
                  }}
                >
                  <span className="pdot" />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {showInstructions && (
            <InstructionsModal
              value={instructions}
              kind="code-explanation"
              onClose={() => setShowInstructions(false)}
              onSave={(v) => {
                setInstructions(v);
                setShowInstructions(false);
              }}
            />
          )}

          {saveError && <div className="aq-gen-error">{saveError}</div>}
        </div>

        <div className="aq-foot">
          <span className="aq-foot-left">
            {editing
              ? 'Saving updates this code question in place.'
              : 'Saves this code question straight to the database.'}
          </span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn-primary btn-save ${saving ? 'saving' : ''}`}
              disabled={!canSave}
              onClick={save}
            >
              {saving ? <Loader2 size={14} className="aq-spin" /> : null}
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Save question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
