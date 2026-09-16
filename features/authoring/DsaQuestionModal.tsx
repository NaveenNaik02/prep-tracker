'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, SlidersHorizontal, AlignLeft, Sparkles } from 'lucide-react';
import AqSelect from '@/components/AqSelect';
import { useAppStore } from '@/lib/stores/appStore';
import { useTypewriter } from '@/lib/hooks';
import { AQ_MODELS, getSavedModel } from '@/lib/ai/models';
import {
  getCodeExplanationInstructionText,
  getDescriptionInstructionText,
} from '@/lib/instructionPresets';
import { addQuestion, updateQuestion } from '@/lib/actions/questions';
import {
  generateCodeOutput,
  generateDsaExplanation,
} from '@/lib/ai/generateCodeOutput';
import { generateDsaQuestion } from '@/lib/ai/generateDsaQuestion';
import {
  BULK_FIELDS,
  type DsaDraft,
  type DsaField,
} from '@/lib/ai/dsaFields';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import {
  findGroup,
  findGroupForSection,
  sectionUrl,
  type SectionMeta,
} from '@/lib/content/topics';
import { addSection } from '@/lib/actions/topics';
import {
  suggestPlacement,
  type PlacementSuggestion,
} from '@/lib/ai/suggestPlacement';
import MarkdownField from './components/MarkdownField';
import InstructionsModal from './components/InstructionsModal';
import { DraftChips } from './components/DraftChips';
import { AqCombo } from './components/AqCombo';
import { GenerateButton } from './components/GenerateButton';
import { useAnswerDrafts } from './hooks/useAnswerDrafts';
import { LANG_OPTIONS } from './types';
import type { DsaQuestionModalProps } from './types';

// Difficulty is the priority column under DSA labels — same three levels, so
// a DSA question stays filterable and sortable as priority everywhere else.
const DIFFICULTY_OPTIONS = [
  { level: 'low', label: 'Easy' },
  { level: 'med', label: 'Medium' },
  { level: 'high', label: 'Hard' },
] as const;

// Any string that can't collide with a real section url.
const STAGED = 'staged:new';

// The DSA subtopic's add/edit form. Stays off the authoring store for the same
// reasons as CodeQuestionModal: no duplicate check, no shared answer-draft
// history, and placement that never leaves the current topic — the picker here
// chooses among that topic's DSA subtopics, not the whole curriculum.
// `code` plus a non-empty `problem` is what makes the saved row render as one.
//
// Every field can be generated on its own, and "Generate all" fills the whole
// question from its header — both go through generateDsaQuestion, which takes
// the list of fields it should return, so either way it is one request.
export const DsaQuestionModal = ({
  section: fixedSection,
  groupSlug,
  editing,
  onClose,
  onSaved,
}: DsaQuestionModalProps) => {
  const groups = useAppStore((s) => s.groups);
  const defaultPriority = useAppStore((s) => s.defaultPriority);
  const group = fixedSection
    ? findGroupForSection(groups, fixedSection)
    : findGroup(groups, groupSlug ?? '');
  // A code-output subtopic is never a DSA destination, so it stays out of the
  // picker even under a DSA topic. The section the modal was opened from is
  // always listed, even if it somehow isn't flagged — otherwise the picker
  // would silently move the question somewhere else.
  const dsaSections = (group?.sections ?? []).filter((s) => s.isDsa);
  const opensOutsideList =
    !!fixedSection &&
    !dsaSections.some((s) => sectionUrl(s) === sectionUrl(fixedSection));
  const choices = opensOutsideList
    ? [fixedSection, ...dsaSections]
    : dsaSections;
  // Named but not yet created — addSection runs on save, so abandoning the
  // form leaves no empty subtopic behind.
  const [stagedLabel, setStagedLabel] = useState<string | null>(null);
  // Proposed, not applied — the card previews where the question would go and
  // only touches the picker when accepted, matching the placement flow in the
  // plain add-question form.
  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(
    null,
  );
  // Sent back on a re-run so "Not this one" has to find a different home.
  const [rejected, setRejected] = useState<PlacementSuggestion[]>([]);
  const [targetUrl, setTargetUrl] = useState(
    fixedSection
      ? sectionUrl(fixedSection)
      : ((choices[0] && sectionUrl(choices[0])) ?? ''),
  );
  const section = choices.find((s) => sectionUrl(s) === targetUrl);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [problem, setProblem] = useState(editing?.problem ?? '');
  const [prerequisites, setPrerequisites] = useState(
    editing?.prerequisites ?? '',
  );
  const [lang, setLang] = useState(editing?.lang || 'js');
  const [code, setCode] = useState(editing?.code ?? '');
  const [output, setOutput] = useState(editing?.output ?? '');
  const [explain, setExplain] = useState(editing?.markdown ?? '');
  const [priority, setPriority] = useState(
    editing ? editing.priority : defaultPriority,
  );
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // One generation runs at a time, so which field is busy and which one failed
  // are single values rather than a flag per button.
  const [busy, setBusy] = useState<string | null>(null);
  const [genError, setGenError] = useState<{
    field: string;
    message: string;
  } | null>(null);
  // The request resolving isn't the end of a generation — the typewriter is
  // still revealing the text. Without this, regenerating mid-stream snapshots
  // a half-written string as a draft and evicts a real one.
  const [streaming, setStreaming] = useState(false);
  const [instructions, setInstructions] = useState(
    getCodeExplanationInstructionText,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  // Its own preset, not the explanation's and not the implementation
  // 'problem' one — that asks for 1-3 sentences, which strips worked examples.
  const [descInstructions, setDescInstructions] = useState(
    getDescriptionInstructionText,
  );
  const [showDescInstructions, setShowDescInstructions] = useState(false);
  const descDrafts = useAnswerDrafts(editing?.problem);
  const explainDrafts = useAnswerDrafts(editing?.markdown);

  const titleRef = useRef<HTMLInputElement>(null);
  const typeOutput = useTypewriter(setOutput);
  const typeExplain = useTypewriter(setExplain);

  useEffect(() => titleRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Every AI button routes through this so only one can be in flight, and a
  // failure names the field it belongs to instead of a page-level error.
  const run = async (field: string, fn: () => Promise<void>) => {
    setBusy(field);
    setGenError(null);
    try {
      await fn();
    } catch (err) {
      setGenError({
        field,
        message:
          err instanceof Error
            ? err.message
            : 'Could not generate — try again.',
      });
    } finally {
      setBusy(null);
    }
  };

  const applyDraft = (d: DsaDraft) => {
    if (d.title) setTitle(d.title);
    if (d.subtopic) {
      // The model is asked to reuse an existing name exactly, but it can still
      // come back with a variant — match loosely, and treat a miss as new.
      const match = choices.find(
        (c) => c.label.toLowerCase() === d.subtopic!.trim().toLowerCase(),
      );
      if (match) {
        setStagedLabel(null);
        setTargetUrl(sectionUrl(match));
      } else {
        setStagedLabel(d.subtopic.trim());
        setTargetUrl(STAGED);
      }
    }
    if (d.description) {
      descDrafts.keep(problem, false);
      setProblem(d.description);
      descDrafts.keep(d.description, true);
    }
    if (d.prerequisites) setPrerequisites(d.prerequisites);
    if (d.code) setCode(d.code);
    if (d.output) setOutput(d.output);
    if (d.difficulty) setPriority(d.difficulty);
    if (d.explanation) {
      explainDrafts.keep(explain, false);
      setExplain(d.explanation);
      explainDrafts.keep(d.explanation, true);
    }
  };

  // Regenerating a field never feeds that field back in as context — it would
  // only be asked to echo what's already there.
  const draftFields = (
    fields: readonly DsaField[],
    key: string = fields.length === 1 ? fields[0] : 'all',
  ) => {
    return run(key, async () => {
      applyDraft(
        await generateDsaQuestion({
          // A field being regenerated is never sent back as its own context —
          // the model would just echo it.
          title: fields.includes('title') ? '' : title,
          lang,
          subtopic: fields.includes('subtopic')
            ? undefined
            : (section?.label ?? stagedLabel ?? undefined),
          subtopics: choices.map((c) => c.label),
          description: fields.includes('description') ? undefined : problem,
          code: fields.includes('code') ? undefined : code,
          fields,
          model: getSavedModel(),
        }),
      );
    });
  };

  const suggest = (turnedDown: PlacementSuggestion[] = rejected) => {
    if (!group) return;
    return run('section', async () => {
      setSuggestion(
        await suggestPlacement({
          title: title.trim(),
          tags: prerequisites.trim(),
          groups: [
            {
              groupSlug: group.slug,
              groupName: group.groupName,
              sections: choices.map((c) => ({
                topic: c.topic,
                file: c.file,
                label: c.label,
              })),
            },
          ],
          rejected: turnedDown,
          model: getSavedModel(),
        }),
      );
    });
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    if (suggestion.mode === 'existing') {
      setStagedLabel(null);
      setTargetUrl(`/${suggestion.topic}/${suggestion.file}`);
    } else {
      // The topic is fixed here, so a 'new-topic' answer is only useful for
      // the subtopic name it came with.
      setStagedLabel(suggestion.label);
      setTargetUrl(STAGED);
    }
    setSuggestion(null);
  };

  const rejectSuggestion = () => {
    if (!suggestion) return;
    const turnedDown = [...rejected, suggestion];
    setRejected(turnedDown);
    setSuggestion(null);
    suggest(turnedDown);
  };

  const runExplain = (generate: () => Promise<string>) => {
    return run('explanation', async () => {
      explainDrafts.keep(explain, false);
      const text = (await generate()).trim();
      explainDrafts.keep(text, true);
      setStreaming(true);
      typeExplain(text, () => setStreaming(false));
    });
  };

  // Editing never fills the subtopic: retargeting it here would move the
  // question on save (new id, progress carried over) as a side effect of
  // "fill the form", which is not what the button says it does.
  const bulkFields: DsaField[] = editing
    ? [...BULK_FIELDS]
    : ['subtopic', ...BULK_FIELDS];
  const hasTitle = title.trim().length > 3;
  const hasCode = code.trim().length > 3;
  const anyBusy = busy !== null || streaming;
  const hasTarget = !!section || targetUrl === STAGED;
  const canSave =
    hasTarget && hasTitle && problem.trim().length > 3 && hasCode && !saving;
  const canFormat = explain.trim().length > 3 && !anyBusy;
  const canFormatDesc = problem.trim().length > 3 && !anyBusy;

  // Format rewrites the description in place, so it parks the old text as a
  // draft first — same contract as the explanation's.
  const formatDescription = () => {
    return run('description', async () => {
      descDrafts.keep(problem, false);
      const text = (
        await formatAnswer({
          text: problem,
          question: title,
          lang,
          isDescription: true,
          instructions: descInstructions,
          model: getSavedModel(),
        })
      ).trim();
      setProblem(text);
      descDrafts.keep(text, true);
    });
  };
  const errorFor = (field: string) => {
    return genError?.field === field ? genError.message : null;
  };
  // Every per-field button is the same thing over a different key, and they
  // all need a header to work from. `also` pulls along fields derived from
  // this one — they come back in the same request, not a second one.
  const fieldButton = (
    field: DsaField,
    hasValue: boolean,
    also: DsaField[] = [],
  ) => {
    const what = also.length ? `this field and the ${also.join(', ')}` : 'this field';
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

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Created here rather than when it was suggested, so a cancelled form
      // never leaves an empty subtopic behind.
      const target: SectionMeta =
        section ??
        (
          await addSection({
            groupSlug: group!.slug,
            label: stagedLabel!,
            isDsa: true,
          })
        ).section;
      const input = {
        topic: target.topic,
        file: target.file,
        title: title.trim(),
        markdown: explain.trim(),
        lang,
        problem: problem.trim(),
        prerequisites: prerequisites.trim(),
        code: code.trim(),
        output: output.trim(),
        priority,
      };
      const question = editing
        ? await updateQuestion(editing.id, input)
        : await addQuestion(input);
      onSaved(question, target);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save — try again.',
      );
      setSaving(false);
    }
  };

  const heading = editing ? 'Edit DSA question' : 'Add DSA question';

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
          {/* Whole-form action, so it sits above the fields rather than in one
              field's label row where every per-field Generate lives. */}
          <div className="aq-field">
            <div className="aq-generate-all">
              <div className="aq-impl-toggle-copy">
                <span className="aq-impl-toggle-title">
                  Fill the form from the question header
                </span>
                <span className="aq-impl-toggle-sub">
                  {bulkFields.includes('subtopic') ? 'Subtopic, description' : 'Description'}
                  , prerequisites, solution, output, explanation and difficulty
                  — one request.
                </span>
              </div>
              <GenerateButton
                loading={busy === 'all'}
                disabled={!hasTitle || anyBusy}
                label="Generate all"
                title={
                  hasTitle
                    ? 'Fill every field below from the question header, in one request'
                    : 'Add a question header first'
                }
                onClick={() => draftFields(bulkFields)}
              />
            </div>
            {errorFor('all') && (
              <div className="aq-gen-error">{errorFor('all')}</div>
            )}
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="dq-section">
                Subtopic{' '}
                <span className="aq-customize-sub">in {group?.groupName}</span>
              </label>
              <GenerateButton
                loading={busy === 'section'}
                disabled={!hasTitle || anyBusy}
                label="Suggest placement"
                loadingLabel="Thinking…"
                title={
                  hasTitle
                    ? 'Suggest which subtopic this question belongs in'
                    : 'Add a question header first'
                }
                onClick={() => suggest()}
              />
            </div>
            {choices.length || stagedLabel ? (
              <AqSelect
                id="dq-section"
                value={targetUrl}
                onChange={(v) => setTargetUrl(v)}
                options={[
                  ...choices.map((c) => ({
                    value: sectionUrl(c),
                    label: c.label,
                  })),
                  ...(stagedLabel
                    ? [{ value: STAGED, label: `${stagedLabel} — new` }]
                    : []),
                ]}
              />
            ) : (
              <div className="aq-select aq-select-static">
                No subtopics yet — use Suggest to name the first one
              </div>
            )}
            {errorFor('section') && (
              <div className="aq-gen-error">{errorFor('section')}</div>
            )}
            {suggestion && (
              <div className="aq-suggest-card">
                <div className="aq-suggest-path">
                  <Sparkles size={13} />
                  <span>
                    <b>{group?.groupName}</b>
                    {' → '}
                    <b>
                      {suggestion.mode === 'existing'
                        ? choices.find(
                            (c) =>
                              c.topic === suggestion.topic &&
                              c.file === suggestion.file,
                          )?.label
                        : suggestion.label}
                    </b>
                    {suggestion.mode !== 'existing' && (
                      <span className="aq-suggest-badge">new subtopic</span>
                    )}
                  </span>
                </div>
                {suggestion.reasoning && (
                  <p className="aq-suggest-reason">{suggestion.reasoning}</p>
                )}
                <div className="aq-suggest-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setSuggestion(null)}
                  >
                    Choose manually
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={rejectSuggestion}
                  >
                    Not this one
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={acceptSuggestion}
                  >
                    Use this placement
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="dq-title">Question header</label>
              {/* The only field not generated *from* the header, so it's the
                  only one that doesn't need one to already be there. */}
              <GenerateButton
                loading={busy === 'title'}
                hasValue={!!title.trim()}
                disabled={anyBusy}
                title="Name a problem for this subtopic, or from what's already filled in"
                onClick={() => draftFields(['title'])}
              />
            </div>
            <input
              id="dq-title"
              ref={titleRef}
              className="aq-input"
              type="text"
              placeholder="e.g. Longest Substring Without Repeating Characters"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errorFor('title') && (
              <div className="aq-gen-error">{errorFor('title')}</div>
            )}
          </div>

          <div className="aq-field">
            <label>
              Description <span className="aq-customize-sub">(Markdown)</span>
            </label>
            <MarkdownField
              tab={descTab}
              onTabChange={setDescTab}
              value={problem}
              onChange={(v) => {
                setProblem(v);
                descDrafts.setActiveId(null);
              }}
              readOnly={busy === 'description'}
              textareaClassName={busy === 'description' ? 'aq-gen-active' : ''}
              placeholder="Given a string `s`, find the length of the longest substring without repeating characters."
              emptyPreviewText="Live preview appears here as you type…"
              toolbar={
                <div className="aq-gen-controls">
                  <button
                    type="button"
                    className={`aq-customize-btn ${descInstructions.trim() ? 'has-value' : ''}`}
                    onClick={() => setShowDescInstructions(true)}
                    title={`Instructions — model: ${AQ_MODELS.find((m) => m.id === getSavedModel())?.label ?? ''}`}
                  >
                    <SlidersHorizontal size={14} />
                    {descInstructions.trim() ? (
                      <span className="aq-customize-dot" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="aq-format-btn"
                    disabled={!canFormatDesc}
                    title={
                      canFormatDesc
                        ? "Reformat the description below into the app's markdown style — keeps your content as-is"
                        : 'Write or paste a description below first'
                    }
                    onClick={formatDescription}
                  >
                    <AlignLeft size={13} /> Format
                  </button>
                  {fieldButton('description', !!problem.trim())}
                </div>
              }
              belowTabs={
                <>
                  <DraftChips
                    versions={descDrafts.versions}
                    activeId={descDrafts.activeId}
                    disabled={anyBusy}
                    onSelect={(v) => {
                      setProblem(v.text);
                      descDrafts.setActiveId(v.id);
                    }}
                  />
                  {errorFor('description') && (
                    <div className="aq-gen-error">
                      {errorFor('description')}
                    </div>
                  )}
                </>
              }
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="dq-prereqs">
                Prerequisites{' '}
                <span className="aq-customize-sub">
                  (optional — what the solver should already know)
                </span>
              </label>
              {fieldButton('prerequisites', !!prerequisites.trim())}
            </div>
            <input
              id="dq-prereqs"
              className="aq-input"
              type="text"
              placeholder="Two Pointers, Hash Set basics"
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
            />
            {errorFor('prerequisites') && (
              <div className="aq-gen-error">{errorFor('prerequisites')}</div>
            )}
          </div>

          <div className="aq-field">
            <label htmlFor="dq-lang">
              Language{' '}
              <span className="aq-customize-sub">
                (pick one or type your own)
              </span>
            </label>
            {/* Typed as well as picked: the generated solution is written in
                whatever is here, so it can't be limited to a fixed list. */}
            <AqCombo
              id="dq-lang"
              value={lang}
              onChange={setLang}
              options={LANG_OPTIONS}
              placeholder="js"
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="dq-code">Solution code</label>
              {fieldButton('code', hasCode, ['output'])}
            </div>
            <textarea
              id="dq-code"
              className="aq-input aq-problem-input"
              rows={9}
              placeholder="Paste the solution code here…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {errorFor('code') && (
              <div className="aq-gen-error">{errorFor('code')}</div>
            )}
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label htmlFor="dq-output">
                Output <span className="aq-customize-sub">(optional)</span>
              </label>
              {/* Runs the code the author actually has, rather than drafting
                  an output from the header the way the bulk fill does. */}
              <GenerateButton
                loading={busy === 'output'}
                hasValue={!!output.trim()}
                disabled={!hasCode || anyBusy}
                title={
                  hasCode
                    ? 'Run the solution above and generate its output'
                    : 'Add code above first'
                }
                onClick={() =>
                  run('output', async () => {
                    const text = (
                      await generateCodeOutput({
                        code,
                        lang,
                        model: getSavedModel(),
                      })
                    ).trim();
                    // `run` clears `busy` the moment this resolves, but the
                    // typewriter is still writing — without this the field
                    // unlocks mid-stream and a second run races it.
                    setStreaming(true);
                    typeOutput(text, () => setStreaming(false));
                  })
                }
              />
            </div>
            <textarea
              id="dq-output"
              className="aq-input aq-problem-input"
              rows={2}
              readOnly={busy === 'output' || streaming}
              placeholder="What the solution prints or returns…"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
            {errorFor('output') && (
              <div className="aq-gen-error">{errorFor('output')}</div>
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
                explainDrafts.setActiveId(null);
              }}
              readOnly={busy === 'explanation' || streaming}
              textareaClassName={
                busy === 'explanation' || streaming ? 'aq-gen-active' : ''
              }
              placeholder="Walk through the approach — algorithm name, complexity, why it works. Or click Generate above."
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
                  <GenerateButton
                    loading={busy === 'explanation' || streaming}
                    hasValue={!!explain.trim()}
                    disabled={!hasCode || anyBusy}
                    title={
                      hasCode
                        ? "Generate an explanation of the solution's approach"
                        : 'Add code above first'
                    }
                    onClick={() => {
                      runExplain(() => {
                        return generateDsaExplanation({
                          code,
                          lang,
                          output,
                          title,
                          instructions,
                          model: getSavedModel(),
                        });
                      });
                    }}
                  />
                </div>
              }
              belowTabs={
                <>
                  <DraftChips
                    versions={explainDrafts.versions}
                    activeId={explainDrafts.activeId}
                    disabled={anyBusy}
                    onSelect={(v) => {
                      setExplain(v.text);
                      explainDrafts.setActiveId(v.id);
                    }}
                  />
                  {errorFor('explanation') && (
                    <div className="aq-gen-error">
                      {errorFor('explanation')}
                    </div>
                  )}
                </>
              }
            />
          </div>

          <div className="aq-field">
            <div className="aq-label-row">
              <label>Difficulty</label>
              {fieldButton('difficulty', !!priority)}
            </div>
            <div className="aq-pills">
              {DIFFICULTY_OPTIONS.map((o) => (
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
            {errorFor('difficulty') && (
              <div className="aq-gen-error">{errorFor('difficulty')}</div>
            )}
          </div>

          {showDescInstructions && (
            <InstructionsModal
              value={descInstructions}
              kind="description"
              onClose={() => setShowDescInstructions(false)}
              onSave={(v) => {
                setDescInstructions(v);
                setShowDescInstructions(false);
              }}
            />
          )}

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
              ? 'Saving updates this DSA question in place.'
              : 'Saves this DSA question straight to the database.'}
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
