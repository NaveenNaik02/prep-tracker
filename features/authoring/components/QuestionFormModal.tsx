'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  AlignLeft,
  Code2,
} from 'lucide-react';
import { AQ_MODELS } from '@/lib/ai/models';
import { loadPresets } from '@/lib/instructionPresets';
import AqSelect from '@/components/AqSelect';
import MarkdownField from '@/components/MarkdownField';
import InstructionsModal from './InstructionsModal';
import { PlacementPicker } from './PlacementPicker';
import { QuestionField } from './QuestionField';
import { AutoRunBanner } from './AutoRunBanner';
import { DraftChips } from './DraftChips';
import { useAuthoring, useAuthoringApi } from '../store/authoringStore';
import { useTypewriterBridge } from '../store/useTypewriterBridge';
import { PRIORITY_OPTIONS, LANG_OPTIONS } from '../types';

// The modal shell: layout, the fields that don't warrant their own component
// yet, and the save/cancel footer. Everything it renders comes from the
// authoring store, so it takes no props — see AuthoringProvider.
export const QuestionFormModal = () => {
  const api = useAuthoringApi();
  useTypewriterBridge();

  const heading = useAuthoring((s) => s.heading);
  const footNote = useAuthoring((s) => s.footNote);
  const submitLabel = useAuthoring((s) => s.submitLabel);
  const onClose = useAuthoring((s) => s.onClose);
  const startAuto = useAuthoring((s) => s.startAuto);
  // Offered only when editing a saved question — a blank Add form has nothing
  // to automate from, and an Inbox assign starts the run on its own. Hidden
  // once a run is underway, since the banner then owns the controls.
  const canAutoRun = useAuthoring((s) => {
    return !!s.original && s.autoStatus === 'idle';
  });

  const title = useAuthoring((s) => s.title);
  const markdown = useAuthoring((s) => s.markdown);
  const problem = useAuthoring((s) => s.problem);
  const tags = useAuthoring((s) => s.tags);
  const setTags = useAuthoring((s) => s.setTags);
  const lang = useAuthoring((s) => s.lang);
  const setLang = useAuthoring((s) => s.setLang);
  const priority = useAuthoring((s) => s.priority);
  const setPriority = useAuthoring((s) => s.setPriority);
  const isImpl = useAuthoring((s) => s.isImpl);
  const wantCodeExample = useAuthoring((s) => s.wantCodeExample);
  const setWantCodeExample = useAuthoring((s) => s.setWantCodeExample);
  const tab = useAuthoring((s) => s.tab);
  const setTab = useAuthoring((s) => s.setTab);
  const instructions = useAuthoring((s) => s.instructions);
  const setInstructions = useAuthoring((s) => s.setInstructions);
  const model = useAuthoring((s) => s.model);
  const showInstructions = useAuthoring((s) => s.showInstructions);
  const setShowInstructions = useAuthoring((s) => s.setShowInstructions);
  const saving = useAuthoring((s) => s.saving);
  const saveError = useAuthoring((s) => s.saveError);
  const save = useAuthoring((s) => s.save);

  const answerVersions = useAuthoring((s) => s.answerVersions);
  const activeVersionId = useAuthoring((s) => s.activeVersionId);
  const editMarkdown = useAuthoring((s) => s.editMarkdown);
  const selectVersion = useAuthoring((s) => s.selectVersion);
  const answerState = useAuthoring((s) => s.answerState);
  const answerError = useAuthoring((s) => s.answerError);
  const generateAnswer = useAuthoring((s) => s.generateAnswer);
  const formatAnswer = useAuthoring((s) => s.formatAnswer);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  const canSave =
    title.trim().length > 3 &&
    markdown.trim().length > 3 &&
    !saving &&
    (!isImpl || problem.trim().length > 3);
  const canGenerate = title.trim().length > 3 && answerState !== 'loading';
  const canFormat = markdown.trim().length > 3 && answerState !== 'loading';

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);
  // An Inbox assign opens mid-run: the store starts on 'running' so the
  // banner is there on the first paint, and this kicks the chain off. The ref
  // is what stops React's development double-mount running it twice.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (api.getState().autoStatus === 'running') api.getState().startAuto();
  }, [api]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Follows the Implementation toggle for a still-untouched instructions
  // draft (still exactly one of the two built-in defaults) — never
  // overwrites instructions the author has actually customized.
  useEffect(() => {
    const presets = loadPresets();
    const textDefault = presets.find((p) => p.kind === 'text')?.text ?? '';
    const codeDefault = presets.find((p) => p.kind === 'code')?.text ?? '';
    const current = api.getState().instructions;
    if (current === textDefault || current === codeDefault) {
      api.getState().setInstructions(isImpl ? codeDefault : textDefault);
    }
  }, [api, isImpl]);

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
          <div className="aq-head-actions">
            {canAutoRun && (
              <button
                type="button"
                className="aq-generate-btn"
                onClick={startAuto}
                title="Regenerate the question, re-check placement, and rewrite the answer automatically"
              >
                <Sparkles size={12.5} /> Auto-run
              </button>
            )}
            <button
              className="aq-close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="aq-body">
          <AutoRunBanner />

          <PlacementPicker />

          <QuestionField inputRef={firstFieldRef} />

          <div className="aq-row">
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
            <div className="aq-field">
              <label htmlFor="aq-lang">Code language hint</label>
              <AqSelect
                id="aq-lang"
                value={lang}
                onChange={setLang}
                options={LANG_OPTIONS.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          <div className="aq-field">
            <label htmlFor="aq-tags">
              Tags{' '}
              <span className="aq-customize-sub">
                (optional, comma-separated)
              </span>
            </label>
            <input
              id="aq-tags"
              className="aq-input"
              type="text"
              placeholder="closures, scope, es6"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="aq-field">
            <label>Answer {isImpl ? '(code only)' : '(Markdown)'}</label>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={markdown}
              onChange={editMarkdown}
              readOnly={answerState === 'loading'}
              textareaClassName={
                answerState === 'loading' ? 'aq-gen-active' : ''
              }
              placeholder={
                isImpl
                  ? 'Paste or write the solution code here — wrap it in a fenced code block, e.g. ```jsx ... ```. Keep this to code only; the problem statement above already covers the explanation. Or click Generate answer above to draft one.'
                  : 'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables. Or click Generate answer above to draft one from your question.'
              }
              emptyPreviewText="Live preview appears here as you type…"
              toolbar={
                <div className="aq-gen-controls">
                  {!isImpl && (
                    <button
                      type="button"
                      className={`aq-code-example-check ${wantCodeExample ? 'on' : ''}`}
                      aria-pressed={wantCodeExample}
                      onClick={() => setWantCodeExample(!wantCodeExample)}
                      title="Ask the generated answer to include a code example"
                    >
                      <Code2 size={13} /> Code example
                    </button>
                  )}
                  <button
                    type="button"
                    className={`aq-customize-btn ${instructions.trim() ? 'has-value' : ''}`}
                    onClick={() => setShowInstructions(true)}
                    title={`Instructions — model: ${AQ_MODELS.find((m) => m.id === model)?.label ?? model}`}
                  >
                    <SlidersHorizontal size={14} />
                    {instructions.trim() ? (
                      <span className="aq-customize-dot" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="aq-format-btn"
                    onClick={formatAnswer}
                    disabled={!canFormat}
                    title={
                      canFormat
                        ? "Reformat the text below into the app's markdown answer style — keeps your content as-is"
                        : 'Write or paste an answer below first'
                    }
                  >
                    <AlignLeft size={13} /> Format
                  </button>
                  <button
                    type="button"
                    className={`aq-generate-btn ${answerState === 'loading' ? 'loading' : ''}`}
                    onClick={generateAnswer}
                    disabled={!canGenerate}
                    title={
                      canGenerate
                        ? 'Generate an answer from the question above'
                        : 'Add a question above first'
                    }
                  >
                    {answerState === 'loading' ? (
                      <>
                        <span className="aq-gen-spinner" />
                        Generating…
                      </>
                    ) : answerState === 'done' ||
                      answerState === 'error' ||
                      answerState === 'limited' ? (
                      <>
                        <RefreshCw size={12.5} /> Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles size={12.5} /> Generate answer
                      </>
                    )}
                  </button>
                </div>
              }
              belowTabs={
                <>
                  <DraftChips
                    versions={answerVersions}
                    activeId={activeVersionId}
                    onSelect={selectVersion}
                  />
                  {answerState === 'error' && answerError && (
                    <div className="aq-gen-error">{answerError}</div>
                  )}
                  {answerState === 'limited' && (
                    <div className="aq-gen-error">
                      {AQ_MODELS.find((m) => m.id === model)?.label ??
                        'This model'}{' '}
                      looks rate-limited — switch models in Settings, or try
                      again shortly.
                    </div>
                  )}
                </>
              }
              afterPanes={
                answerState === 'done' && (
                  <div className="aq-gen-note">
                    <Sparkles size={11} />
                    AI-drafted — review before saving.
                  </div>
                )
              }
            />
          </div>

          {showInstructions && (
            <InstructionsModal
              value={instructions}
              kind={isImpl ? 'code' : 'text'}
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
          <span className="aq-foot-left">{footNote}</span>
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
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
