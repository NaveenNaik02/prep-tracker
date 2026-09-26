import type { StateCreator } from 'zustand';
import { getSavedModel } from '@/lib/ai/models';
import { generateDsaQuestion } from '@/lib/ai/generateDsaQuestion';
import { placementOf } from './placementSlice';
import type { AiSlice, DsaState } from './types';

export const createAiSlice: StateCreator<DsaState, [], [], AiSlice> = (
  set,
  get,
) => ({
  busy: null,
  genError: null,
  streaming: false,

  setStreaming: (streaming) => set({ streaming }),

  // Every AI button routes through this so only one can be in flight, and a
  // failure names the field it belongs to instead of a page-level error.
  run: async (field, fn) => {
    set({ busy: field, genError: null });
    try {
      await fn();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not generate — try again.';
      set({ genError: { field, message } });
    } finally {
      set({ busy: null });
    }
  },

  applyDraft: (d) => {
    const s = get();
    if (d.title) s.setTitle(d.title);
    if (d.subtopic) s.stageOrSelect(d.subtopic);
    if (d.description) {
      s.keepDraft('descDrafts', s.problem, false);
      s.setProblem(d.description);
      s.keepDraft('descDrafts', d.description, true);
    }
    if (d.prerequisites) s.setPrerequisites(d.prerequisites);
    if (d.code) s.setCode(d.code);
    if (d.output) s.setOutput(d.output);
    if (d.difficulty) s.setPriority(d.difficulty);
    if (d.explanation) {
      s.keepDraft('explainDrafts', s.explain, false);
      s.setExplain(d.explanation);
      s.keepDraft('explainDrafts', d.explanation, true);
    }
  },

  draftFields: (fields, key = fields.length === 1 ? fields[0] : 'all') => {
    const s = get();
    const { label, choices } = placementOf(s);
    return s.run(key, async () => {
      get().applyDraft(
        await generateDsaQuestion({
          // A field being regenerated is never sent back as its own context —
          // the model would just echo it.
          title: fields.includes('title') ? '' : s.title,
          lang: s.lang,
          subtopic: fields.includes('subtopic') ? undefined : label,
          subtopics: choices.map((c) => c.label),
          description: fields.includes('description') ? undefined : s.problem,
          code: fields.includes('code') ? undefined : s.code,
          fields,
          model: getSavedModel(),
        }),
      );
    });
  },
});
