import type { SectionMeta, TopicGroup } from '@/lib/content/topics';
import type { PlacementSuggestion } from '@/lib/ai/suggestPlacement';
import type { DsaDraft, DsaField } from '@/lib/ai/dsaFields';
import type { PriorityLevel } from '@/lib/types';
import type { AnswerVersion, DsaQuestionModalProps } from '../../types';

export type DsaInit = Omit<DsaQuestionModalProps, 'section' | 'onClose'> & {
  fixedSection?: SectionMeta;
  groups: TopicGroup[];
  defaultPriority: PriorityLevel | null;
};

// A field's generated-draft history: one per Markdown field, never shared.
export interface Drafts {
  versions: AnswerVersion[];
  activeId: string | null;
  // Every text ever parked, so a re-park is a no-op even once the cap has
  // evicted it from `versions`.
  parked: string[];
  count: number;
}

export type DraftKey = 'descDrafts' | 'explainDrafts';

export interface FieldsSlice {
  title: string;
  problem: string;
  prerequisites: string;
  lang: string;
  code: string;
  output: string;
  explain: string;
  priority: PriorityLevel | null;
  descDrafts: Drafts;
  explainDrafts: Drafts;
  saving: boolean;
  saveError: string | null;

  setTitle: (v: string) => void;
  setPrerequisites: (v: string) => void;
  setLang: (v: string) => void;
  setCode: (v: string) => void;
  setOutput: (v: string) => void;
  setPriority: (v: PriorityLevel | null) => void;
  // Set by generation — keeps the selected draft chip.
  setProblem: (v: string) => void;
  setExplain: (v: string) => void;
  // Typed by hand — the text is no longer that draft, so the chip deselects.
  editProblem: (v: string) => void;
  editExplain: (v: string) => void;
  keepDraft: (key: DraftKey, text: string, select: boolean) => void;
  selectDraft: (key: DraftKey, v: AnswerVersion) => void;
  save: () => Promise<void>;
}

export interface AiSlice {
  // One generation runs at a time, so which field is busy and which one
  // failed are single values rather than a flag per button.
  busy: string | null;
  genError: { field: string; message: string } | null;
  // The request resolving isn't the end of a generation — the typewriter is
  // still revealing the text.
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  run: (field: string, fn: () => Promise<void>) => Promise<void>;
  applyDraft: (d: DsaDraft) => void;
  draftFields: (fields: readonly DsaField[], key?: string) => Promise<void>;
}

export interface PlacementSlice {
  groups: TopicGroup[];
  // Named but not yet created — addSection runs on save.
  stagedLabel: string | null;
  targetUrl: string;
  // Every suggestion offered so far; `at` is the one on the card, -1 hides it.
  history: PlacementSuggestion[];
  at: number;

  setGroups: (groups: TopicGroup[]) => void;
  setTargetUrl: (url: string) => void;
  stageOrSelect: (name: string) => void;
  suggest: () => Promise<void>;
  accept: () => void;
  reject: () => Promise<void>;
  back: () => void;
  dismiss: () => void;
  resolveTarget: () => Promise<SectionMeta>;
}

export type DsaState = FieldsSlice &
  AiSlice &
  PlacementSlice & {
    isEditing: boolean;
    fixedSection?: SectionMeta;
    groupSlug?: string;
    editingId?: string;
    onSaved: DsaQuestionModalProps['onSaved'];
  };
