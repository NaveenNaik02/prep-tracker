'use client';

import { useEffect, useState } from 'react';
import { X, Github, Sparkles, Database, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { addTopicGroup, addSection } from '@/lib/actions/topics';
import { generateTopicBlurb } from '@/lib/ai/generateBlurb';
import {
  isCodeOutputSection,
  CODE_OUTPUT_LABEL,
  type TopicGroup,
  type SectionMeta,
} from '@/lib/content/topics';
import { useTypewriter } from '@/lib/hooks';
import AqSelect from './AqSelect';

type Mode = 'topic' | 'subtopic';

export type AddTopicSaved =
  | { kind: 'topic'; group: TopicGroup }
  | { kind: 'subtopic'; section: SectionMeta; group: TopicGroup };

interface Props {
  initialMode?: Mode;
  initialGroupSlug?: string;
  onClose: () => void;
  onSaved: (result: AddTopicSaved) => void;
}

export default function AddTopicModal({
  initialMode = 'topic',
  initialGroupSlug,
  onClose,
  onSaved,
}: Props) {
  const { user, mounted, signInWithGitHub } = useAppStore(
    useShallow((s) => ({
      user: s.user,
      mounted: s.mounted,
      signInWithGitHub: s.signInWithGitHub,
    })),
  );
  const groups = useAppStore((s) => s.groups);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [groupSlug, setGroupSlug] = useState(
    initialGroupSlug ?? groups[0]?.slug ?? '',
  );
  const [topicName, setTopicName] = useState('');
  const [blurb, setBlurb] = useState('');
  const [subLabel, setSubLabel] = useState('');
  const [subIsCode, setSubIsCode] = useState(false);
  const [topicIsDsa, setTopicIsDsa] = useState(false);
  const [subIsDsa, setSubIsDsa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blurbGen, setBlurbGen] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const typewriteBlurb = useTypewriter(setBlurb);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isAnonymous = mounted && !!user?.is_anonymous;

  const parentGroup = groups.find((g) => g.slug === groupSlug);
  // A topic gets at most one code-output subtopic, so the toggle disappears
  // once its parent has one. Switching to such a parent with the toggle
  // already on would otherwise submit a request the insert can only reject.
  const parentHasCodeSub = !!parentGroup?.sections.some(isCodeOutputSection);
  // Under a DSA topic every subtopic is a DSA subtopic, so there's nothing to
  // choose — addSection ORs the parent's flag in either way.
  const parentTopicIsDsa = !!parentGroup?.isDsa;
  const isCode = subIsCode && !parentHasCodeSub;
  const isDsa = subIsDsa && !parentTopicIsDsa;
  // isCode is tested first because addSection resolves it the same way
  // (`isDsa = !input.isCode && …`) — a code-output subtopic under a DSA topic
  // is still a code-output subtopic.
  const firstQuestionLabel = isCode
    ? 'code question'
    : parentTopicIsDsa || isDsa
      ? 'first DSA question'
      : 'first one';

  const canGenerateBlurb =
    topicName.trim().length > 1 && blurbGen !== 'loading';
  const handleGenerateBlurb = async () => {
    if (!canGenerateBlurb) return;
    setBlurbGen('loading');
    try {
      const text = await generateTopicBlurb(topicName);
      typewriteBlurb(text);
      setBlurbGen('idle');
    } catch {
      setBlurbGen('error');
    }
  };

  const canSave =
    mode === 'topic'
      ? topicName.trim().length > 1
      : subLabel.trim().length > 1 && !!groupSlug;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === 'topic') {
        const group = await addTopicGroup({
          groupName: topicName,
          blurb,
          isDsa: topicIsDsa,
        });
        onSaved({ kind: 'topic', group });
      } else {
        const { section, group } = await addSection({
          groupSlug,
          label: subLabel,
          isCode,
          isDsa,
        });
        onSaved({ kind: 'subtopic', section, group });
      }
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
        style={{ maxWidth: 560 }}
        role="dialog"
        aria-modal="true"
        aria-label="Add topic or subtopic"
      >
        <div className="aq-head">
          <h2>{mode === 'topic' ? 'Add topic' : 'Add subtopic'}</h2>
          <button
            className="aq-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {isAnonymous ? (
          <div className="aq-body">
            <p className="aq-signin-msg">
              Sign in with GitHub to add your own topics — this keeps authorship
              attached to your account.
            </p>
            <button className="btn btn-primary" onClick={signInWithGitHub}>
              <Github size={14} /> Sign in with GitHub
            </button>
          </div>
        ) : (
          <>
            <div className="aq-body">
              <div className="aq-field">
                <label>What are you adding?</label>
                <div className="aq-mode-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'topic'}
                    className={`aq-mode-btn ${mode === 'topic' ? 'on' : ''}`}
                    onClick={() => setMode('topic')}
                  >
                    New topic
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'subtopic'}
                    className={`aq-mode-btn ${mode === 'subtopic' ? 'on' : ''}`}
                    onClick={() => setMode('subtopic')}
                  >
                    New subtopic
                  </button>
                </div>
              </div>

              {mode === 'topic' ? (
                <>
                  <div className="aq-field">
                    <label htmlFor="at-name">Topic name</label>
                    <input
                      id="at-name"
                      className="aq-input"
                      type="text"
                      placeholder="e.g. System Design"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                    />
                  </div>
                  <div className="aq-field">
                    <div className="aq-label-row">
                      <label htmlFor="at-blurb">
                        Blurb{' '}
                        <span className="aq-customize-sub">
                          (shows on the topic&apos;s dashboard card)
                        </span>
                      </label>
                      <button
                        type="button"
                        className={`aq-generate-btn ${blurbGen === 'loading' ? 'loading' : ''}`}
                        onClick={handleGenerateBlurb}
                        disabled={!canGenerateBlurb}
                        title={
                          canGenerateBlurb
                            ? 'Generate a blurb from the topic name'
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
                      id="at-blurb"
                      className="aq-input"
                      type="text"
                      placeholder="e.g. Scalability, tradeoffs, and high-level architecture."
                      value={blurb}
                      onChange={(e) => setBlurb(e.target.value)}
                    />
                    {blurbGen === 'error' && (
                      <div
                        className="aq-gen-error"
                        style={{ padding: '6px 0 0', background: 'none' }}
                      >
                        Couldn&apos;t generate — try again.
                      </div>
                    )}
                  </div>
                  <div className="aq-field">
                    <div className="aq-impl-toggle-row">
                      <label className="aq-toggle">
                        <input
                          type="checkbox"
                          checked={topicIsDsa}
                          onChange={(e) => setTopicIsDsa(e.target.checked)}
                        />
                        <span className="aq-toggle-track">
                          <span className="aq-toggle-thumb" />
                        </span>
                      </label>
                      <div className="aq-impl-toggle-copy">
                        <span className="aq-impl-toggle-title">DSA topic</span>
                        <span className="aq-impl-toggle-sub">
                          Every subtopic you add under this topic is a DSA
                          subtopic automatically — description, prerequisites,
                          Solution/Output/Explanation
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="aq-hint">
                    A new topic starts empty — you&apos;ll add subtopics to it
                    next.
                  </p>
                </>
              ) : (
                <>
                  <div className="aq-field">
                    <label htmlFor="as-topic">Parent topic</label>
                    <AqSelect
                      id="as-topic"
                      value={groupSlug}
                      onChange={setGroupSlug}
                      options={groups.map((g) => ({
                        value: g.slug,
                        label: g.groupName,
                      }))}
                    />
                  </div>
                  <div className="aq-field">
                    <label htmlFor="as-name">Subtopic name</label>
                    <input
                      id="as-name"
                      className="aq-input"
                      type="text"
                      placeholder="e.g. Closures"
                      value={subLabel}
                      onChange={(e) => setSubLabel(e.target.value)}
                    />
                  </div>
                  {!parentHasCodeSub && (
                    <div className="aq-field">
                      <div className="aq-impl-toggle-row">
                        <label className="aq-toggle">
                          <input
                            type="checkbox"
                            checked={subIsCode}
                            onChange={(e) => {
                              setSubIsCode(e.target.checked);
                              if (e.target.checked) {
                                setSubIsDsa(false);
                                if (!subLabel.trim()) {
                                  setSubLabel(CODE_OUTPUT_LABEL);
                                }
                              }
                            }}
                          />
                          <span className="aq-toggle-track">
                            <span className="aq-toggle-thumb" />
                          </span>
                        </label>
                        <div className="aq-impl-toggle-copy">
                          <span className="aq-impl-toggle-title">
                            Code-output subtopic
                          </span>
                          <span className="aq-impl-toggle-sub">
                            Holds code snippets with a collapsed
                            output/explanation — not a regular question list
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!parentTopicIsDsa && (
                    <div className="aq-field">
                      <div className="aq-impl-toggle-row">
                        <label className="aq-toggle">
                          <input
                            type="checkbox"
                            checked={subIsDsa}
                            onChange={(e) => {
                              setSubIsDsa(e.target.checked);
                              if (e.target.checked) setSubIsCode(false);
                            }}
                          />
                          <span className="aq-toggle-track">
                            <span className="aq-toggle-thumb" />
                          </span>
                        </label>
                        <div className="aq-impl-toggle-copy">
                          <span className="aq-impl-toggle-title">
                            DSA subtopic
                          </span>
                          <span className="aq-impl-toggle-sub">
                            Questions here get a description, prerequisites, and
                            a Solution/Output/Explanation layout instead of a
                            plain answer
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="aq-hint">
                    Starts with no questions — click the + button again once
                    you&apos;re on its page to add the {firstQuestionLabel}.
                  </p>
                </>
              )}

              {error && <div className="aq-gen-error">{error}</div>}
            </div>

            <div className="aq-foot">
              <span className="aq-foot-left">
                <Database size={13} />
                {mode === 'topic'
                  ? 'Creates a new top-level topic immediately — no file editing needed.'
                  : 'Adds this subtopic to the curriculum immediately.'}
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
                    : mode === 'topic'
                      ? 'Create topic'
                      : 'Create subtopic'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
