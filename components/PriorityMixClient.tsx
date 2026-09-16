'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import {
  sectionUrl,
  findGroupForSection,
  type SectionMeta,
} from '@/lib/content/topics';
import { setAsideQuestion } from '@/lib/actions/setAside';
import {
  setStarred,
  setGreyZone,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';
import type { PriorityMixQuestion } from '@/lib/db/priority';
import type { PriorityLevel } from '@/lib/types';
import {
  DsaQuestionModal,
  EditQuestionModal,
  type EditingDsaQuestion,
  type EditingQuestion,
} from '@/features/authoring';
import { htmlToMarkdown } from '@/lib/htmlToMarkdown';
import QuestionItem, {
  QuestionAnswerBody,
  QuestionCrumb,
  StarButton,
  stripHtml,
} from './QuestionItem';
import RowActions from './RowActions';
import MoveQuestionModal from './MoveQuestionModal';
import SaveToast from './SaveToast';
import { useDeleteToast } from './useDeleteToast';

interface Props {
  questions: PriorityMixQuestion[];
}

const PRI_OPTIONS: { k: PriorityLevel; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
];
const PRI_RANK: Record<PriorityLevel, number> = { high: 3, med: 2, low: 1 };

interface FlatSub {
  key: string;
  label: string;
  topicName: string;
}

const MAX_SUB_CHIPS = 3;

// Cmd-K-style multi-select: chips + search trigger + keyboard-navigable
// overlay, so picking subtopics across many topics doesn't need a giant
// checkbox tree.
function SubtopicCommandPalette({
  flatSubs,
  selected,
  onToggle,
  onClose,
}: {
  flatSubs: FlatSub[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const q = query.toLowerCase();
  const filtered = flatSubs.filter(
    (s) =>
      !q ||
      s.label.toLowerCase().includes(q) ||
      s.topicName.toLowerCase().includes(q),
  );
  const chosen = flatSubs.filter((s) => selected.has(s.key));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const s = filtered[activeIdx];
      if (s) onToggle(s.key);
    }
  };

  return (
    <div
      className="scp-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="scp-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Choose subtopics"
      >
        <div className="scp-search-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Jump to a subtopic…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="scp-esc" onClick={onClose}>
            ESC
          </button>
        </div>
        <div className="scp-list">
          {filtered.length === 0 && (
            <div className="ssp-empty">
              No subtopics match &quot;{query}&quot;
            </div>
          )}
          {filtered.map((s, i) => {
            const on = selected.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={`scp-row ${on ? 'sel' : ''} ${i === activeIdx ? 'active' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onToggle(s.key)}
                aria-pressed={on}
              >
                <span className="scp-dot" />
                <span className="scp-name">{s.label}</span>
                <span className="scp-topic">{s.topicName}</span>
                {i === activeIdx && <span className="scp-enter">↵</span>}
              </button>
            );
          })}
        </div>
        {chosen.length > 0 && (
          <div className="scp-tray">
            {chosen.map((s) => (
              <span key={s.key} className="scp-chip">
                <span className="scp-chip-topic">{s.topicName}</span>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubtopicPicker({
  flatSubs,
  selected,
  onToggle,
}: {
  flatSubs: FlatSub[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const chosen = flatSubs.filter((s) => selected.has(s.key));
  const shown = chosen.slice(0, MAX_SUB_CHIPS);
  const rest = chosen.slice(MAX_SUB_CHIPS);

  return (
    <div className="ssp-outer">
      <div className="ssp-chip-row">
        {shown.map((s) => (
          <span key={s.key} className="ssp-chip">
            <span className="scp-chip-topic">{s.topicName}</span>
            {s.label}
            <button
              type="button"
              onClick={() => onToggle(s.key)}
              aria-label={`Remove ${s.label}`}
            >
              <X size={8} />
            </button>
          </span>
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            className="ssp-chip-more"
            onClick={() => setPaletteOpen(true)}
          >
            +{rest.length} more
          </button>
        )}
      </div>
      <button
        type="button"
        className="ssp-trigger"
        onClick={() => setPaletteOpen(true)}
      >
        <Search size={14} />
        <span>
          {chosen.length ? 'Add or edit subtopics…' : 'Search subtopics…'}
        </span>
      </button>
      {paletteOpen && (
        <SubtopicCommandPalette
          flatSubs={flatSubs}
          selected={selected}
          onToggle={onToggle}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}

export default function PriorityMixClient({
  questions: serverQuestions,
}: Props) {
  const { toggle, mounted, user, appendSetAsideItem, bumpFlagCount, store } =
    useAppStore(
    useShallow((s) => ({
      toggle: s.toggle,
      mounted: s.mounted,
      user: s.user,
      appendSetAsideItem: s.appendSetAsideItem,
      bumpFlagCount: s.bumpFlagCount,
      store: s.store,
    })),
  );

  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted],
  );

  const navigateAfterMove = useAppStore((s) => s.navigateAfterMove);
  const [questions, setQuestions] = useState(serverQuestions);
  const groups = useAppStore((s) => s.groups);
  const flatSubs = useMemo(
    () =>
      groups.flatMap((g) =>
        g.sections.map((s: SectionMeta) => ({
          key: sectionUrl(s),
          label: s.label,
          topicName: g.groupName,
        })),
      ),
    [groups],
  );
  const router = useRouter();
  const { remove, toast: deleteToast } = useDeleteToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [editingDsa, setEditingDsa] = useState<{
    editing: EditingDsaQuestion;
    section: SectionMeta;
  } | null>(null);
  const [movingQuestion, setMovingQuestion] = useState<{
    id: string;
    label: string;
    section: SectionMeta;
  } | null>(null);
  const [moveToast, setMoveToast] = useState<string | null>(null);
  const [asideToast, setAsideToast] = useState(false);

  const [selPri, setSelPri] = useState<Set<PriorityLevel>>(new Set());
  const [selSubs, setSelSubs] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'all' | 'unchecked' | 'checked'>('all');

  const togglePri = (k: PriorityLevel) =>
    setSelPri((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const toggleSub = (key: string) =>
    setSelSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const clearAll = () => {
    setSelPri(new Set());
    setSelSubs(new Set());
    setStatus('all');
  };

  // Live priority per question — reflects local optimistic edits (priority
  // now lives on the question row itself, see ParsedQuestion/PriorityMixQuestion)
  // so unflagging a question here drops it from the list immediately.
  const flagged = useMemo(() => {
    return questions
      .map((q) => ({
        q,
        priority: q.priority,
        subKey: sectionUrl({ topic: q.topic, file: q.file, label: q.label }),
      }))
      .filter(
        (
          r,
        ): r is {
          q: PriorityMixQuestion;
          priority: PriorityLevel;
          subKey: string;
        } => r.priority !== null,
      );
  }, [questions]);

  const priCounts = useMemo(() => {
    const c: Record<PriorityLevel, number> = { high: 0, med: 0, low: 0 };
    for (const r of flagged) c[r.priority]++;
    return c;
  }, [flagged]);

  const hasBoth = selPri.size > 0 && selSubs.size > 0;
  const matched = useMemo(() => {
    if (!hasBoth) return [];
    return flagged
      .filter((r) => selPri.has(r.priority) && selSubs.has(r.subKey))
      .filter((r) =>
        status === 'checked'
          ? isComplete(r.q.id)
          : status === 'unchecked'
            ? !isComplete(r.q.id)
            : true,
      )
      .sort((a, b) => PRI_RANK[b.priority] - PRI_RANK[a.priority]);
  }, [flagged, selPri, selSubs, status, hasBoth, isComplete]);

  // Changing a question's priority can move it elsewhere in this sorted/
  // filtered list — that's expected. What shouldn't happen is the viewport
  // following it there: the user is reading wherever they currently are and
  // wants to keep reading from that same spot, not get dragged to the
  // question's new slot. So pin the raw window scroll offset across the
  // reorder instead of trying to keep any particular row in view.
  const savedScrollYRef = useRef<number | null>(null);

  const handleSetPriority = (id: string, level: PriorityLevel | null) => {
    savedScrollYRef.current = window.scrollY;
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, priority: level } : q)),
    );
    setPriorityAction(id, level).catch((err) =>
      console.error('[priority] write failed:', err),
    );
  };

  const handleToggleStar = (id: string, wasStarred: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, starred: !wasStarred } : q)),
    );
    bumpFlagCount('starred', wasStarred ? -1 : 1);
    setStarred(id, !wasStarred).catch((err) =>
      console.error('[starred] write failed:', err),
    );
  };

  const handleToggleGreyZone = (id: string, wasGreyZone: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, greyZone: !wasGreyZone } : q)),
    );
    bumpFlagCount('grey_zone', wasGreyZone ? -1 : 1);
    setGreyZone(id, !wasGreyZone).catch((err) =>
      console.error('[grey_zone] write failed:', err),
    );
  };

  useLayoutEffect(() => {
    if (savedScrollYRef.current === null) return;
    window.scrollTo(0, savedScrollYRef.current);
    savedScrollYRef.current = null;
  }, [matched]);

  const selectedSubLabels = flatSubs
    .filter((s) => selSubs.has(s.key))
    .map((s) => s.label);
  const priTxt = selPri.size
    ? PRI_OPTIONS.filter((p) => selPri.has(p.k))
        .map((p) => p.label)
        .join(' + ')
    : 'any priority';
  const subTxt = selectedSubLabels.length
    ? selectedSubLabels.length <= 2
      ? selectedSubLabels.join(', ')
      : `${selectedSubLabels.length} subtopics`
    : 'any subtopic';
  const STATUS_LABEL = {
    all: 'any status',
    unchecked: 'unchecked only',
    checked: 'checked only',
  };
  const summary =
    !selPri.size && !selSubs.size
      ? 'Nothing selected yet — pick a priority and subtopics'
      : `${priTxt} · ${subTxt} · ${STATUS_LABEL[status]}${hasBoth ? ` — ${matched.length} question${matched.length === 1 ? '' : 's'}` : ''}`;

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Custom set</div>
        <h1 className="subtopic-title">Priority Mix</h1>
        <p className="build-lede">
          Pick a priority and the subtopics you want — the matching questions
          get pulled onto this page.
        </p>
      </div>

      <div className="builder">
        <div className="bd-row">
          <span className="bd-lab">Priority</span>
          <div className="aq-pills">
            {PRI_OPTIONS.map((p) => (
              <button
                key={p.k}
                type="button"
                className={`aq-pill ${p.k} ${selPri.has(p.k) ? 'on' : ''}`}
                onClick={() => togglePri(p.k)}
                aria-pressed={selPri.has(p.k)}
              >
                <span className="pdot" />
                {p.label} <span className="pct">{priCounts[p.k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bd-row">
          <span className="bd-lab">Subtopics</span>
          <SubtopicPicker
            flatSubs={flatSubs}
            selected={selSubs}
            onToggle={toggleSub}
          />
        </div>
        <div className="bd-row">
          <span className="bd-lab">Status</span>
          <div className="aq-pills">
            <button
              type="button"
              className={`aq-pill ${status === 'all' ? 'on' : ''}`}
              onClick={() => setStatus('all')}
              aria-pressed={status === 'all'}
            >
              All
            </button>
            <button
              type="button"
              className={`aq-pill ${status === 'unchecked' ? 'on' : ''}`}
              onClick={() => setStatus('unchecked')}
              aria-pressed={status === 'unchecked'}
            >
              Unchecked only
            </button>
            <button
              type="button"
              className={`aq-pill ${status === 'checked' ? 'on' : ''}`}
              onClick={() => setStatus('checked')}
              aria-pressed={status === 'checked'}
            >
              Checked only
            </button>
          </div>
        </div>
        <div className="bd-foot">
          <span className="bd-summary">{summary}</span>
          {(selPri.size > 0 || selSubs.size > 0) && (
            <button type="button" className="bd-clear" onClick={clearAll}>
              Clear
            </button>
          )}
        </div>
      </div>

      {!hasBoth ? (
        <div className="empty-set">
          <div className="es-title">Your set is empty</div>
          <div className="es-sub">
            Select at least one priority and one subtopic above to pull matching
            questions onto this page.
          </div>
        </div>
      ) : matched.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">No matches</div>
          <div className="es-sub">
            {flagged.length === 0
              ? "You haven't flagged any questions with a priority yet. Open a subtopic, set a High/Med/Low priority on a few questions, then come back here."
              : 'No questions match this combination. Try a different priority or subtopic.'}
          </div>
        </div>
      ) : (
        <div className="questions-list">
          {matched.map((r) => {
            const group = findGroupForSection(groups, {
              topic: r.q.topic,
              file: r.q.file,
              label: r.q.label,
            });
            const section: SectionMeta = {
              topic: r.q.topic,
              file: r.q.file,
              label: r.q.label,
            };
            const canManage =
              mounted &&
              !!user &&
              (r.q.createdBy === user.id ||
                user.app_metadata?.is_admin === true);
            return (
              <QuestionItem
                key={r.q.id}
                id={r.q.id}
                title={r.q.title}
                isDone={isComplete(r.q.id)}
                isOpen={openId === r.q.id}
                priority={r.priority}
                onToggleOpen={() =>
                  setOpenId(openId === r.q.id ? null : r.q.id)
                }
                onToggleDone={() => toggle(r.q.id)}
                subtitle={
                  <QuestionCrumb
                    topicLabel={group?.groupName ?? r.q.groupSlug}
                    subLabel={r.q.label}
                    href={r.subKey}
                  />
                }
                actions={
                  <>
                    <StarButton
                      isStarred={r.q.starred}
                      onToggle={() => handleToggleStar(r.q.id, r.q.starred)}
                    />
                    <RowActions
                      getText={() => stripHtml(r.q.title)}
                      isStarred={r.q.starred}
                      onToggleStar={() => handleToggleStar(r.q.id, r.q.starred)}
                      isGreyZone={r.q.greyZone}
                      onToggleGreyZone={() =>
                        handleToggleGreyZone(r.q.id, r.q.greyZone)
                      }
                      priority={r.priority}
                      onSetPriority={(level) =>
                        handleSetPriority(r.q.id, level)
                      }
                      onEdit={
                        canManage
                          ? () => {
                              if (r.q.code && r.q.problem) {
                                setEditingDsa({
                                  section,
                                  editing: {
                                    id: r.q.id,
                                    title: r.q.title,
                                    problem: r.q.problem ?? '',
                                    prerequisites: r.q.prerequisites ?? null,
                                    lang: r.q.lang ?? null,
                                    code: r.q.code ?? '',
                                    output: r.q.output ?? null,
                                    markdown: r.q.markdown ?? '',
                                    priority: r.priority,
                                  },
                                });
                                return;
                              }
                              setEditingQuestion({
                                id: r.q.id,
                                title: r.q.title,
                                // ETL-imported questions never had raw markdown persisted,
                                // only the pre-rendered HTML — fall back to a best-effort
                                // conversion so the edit form isn't blank.
                                markdown:
                                  r.q.markdown || htmlToMarkdown(r.q.bodyHtml),
                                section,
                                priority: r.priority,
                                lang: r.q.lang,
                                tags: r.q.tags,
                                problem: r.q.problem,
                              });
                            }
                          : undefined
                      }
                      onMove={
                        canManage
                          ? () =>
                              setMovingQuestion({
                                id: r.q.id,
                                label: r.q.title,
                                section,
                              })
                          : undefined
                      }
                      onSetAside={
                        canManage
                          ? async () => {
                              const item = await setAsideQuestion(r.q.id);
                              appendSetAsideItem(item);
                              setAsideToast(true);
                              setTimeout(() => setAsideToast(false), 3600);
                              router.refresh();
                            }
                          : undefined
                      }
                      onDelete={
                        canManage ? () => remove(r.q.id) : undefined
                      }
                    />
                  </>
                }
              >
                <QuestionAnswerBody q={r.q} />
              </QuestionItem>
            );
          })}
        </div>
      )}


      {editingDsa && (
        <DsaQuestionModal
          section={editingDsa.section}
          editing={editingDsa.editing}
          onClose={() => setEditingDsa(null)}
          onSaved={() => {
            setEditingDsa(null);
            router.refresh();
          }}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onDeleted={(id) => {
            setEditingQuestion(null);
            remove(id);
          }}
          onSaved={() => {
            setEditingQuestion(null);
            router.refresh();
          }}
        />
      )}

      {movingQuestion && (
        <MoveQuestionModal
          groups={groups}
          questionId={movingQuestion.id}
          label={movingQuestion.label}
          currentSection={movingQuestion.section}
          onClose={() => setMovingQuestion(null)}
          onMoved={(destination) => {
            setMovingQuestion(null);
            if (navigateAfterMove) {
              router.push(sectionUrl(destination));
            } else {
              const destGroup = findGroupForSection(groups, destination);
              setMoveToast(
                `${destGroup?.groupName ?? ''} → ${destination.label}`,
              );
              setTimeout(() => setMoveToast(null), 3600);
              router.refresh();
            }
          }}
        />
      )}

      {deleteToast}
      {moveToast && <SaveToast title="Moved" detail={moveToast} />}
      {asideToast && (
        <SaveToast
          title="Set aside"
          detail="Find it in Inbox whenever you're ready."
        />
      )}
    </div>
  );
}
