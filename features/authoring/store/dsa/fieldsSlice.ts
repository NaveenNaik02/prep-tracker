import type { StateCreator } from 'zustand';
import { addQuestion, updateQuestion } from '@/lib/actions/questions';
import { initDrafts, keepDraft } from './drafts';
import type { DsaInit, DsaState, FieldsSlice } from './types';

export const createFieldsSlice = (
  init: DsaInit,
): StateCreator<DsaState, [], [], FieldsSlice> => {
  return (set, get) => {
    const e = init.editing;
    return {
      title: e?.title ?? '',
      problem: e?.problem ?? '',
      prerequisites: e?.prerequisites ?? '',
      lang: e?.lang || 'js',
      code: e?.code ?? '',
      output: e?.output ?? '',
      explain: e?.markdown ?? '',
      priority: e ? e.priority : init.defaultPriority,
      descDrafts: initDrafts(e?.problem),
      explainDrafts: initDrafts(e?.markdown),
      saving: false,
      saveError: null,

      setTitle: (title) => set({ title }),
      setPrerequisites: (prerequisites) => set({ prerequisites }),
      setLang: (lang) => set({ lang }),
      setCode: (code) => set({ code }),
      setOutput: (output) => set({ output }),
      setPriority: (priority) => set({ priority }),
      setProblem: (problem) => set({ problem }),
      setExplain: (explain) => set({ explain }),
      editProblem: (problem) => {
        set((s) => ({
          problem,
          descDrafts: { ...s.descDrafts, activeId: null },
        }));
      },
      editExplain: (explain) => {
        set((s) => ({
          explain,
          explainDrafts: { ...s.explainDrafts, activeId: null },
        }));
      },
      keepDraft: (key, text, select) => {
        set((s) => ({ [key]: keepDraft(s[key], text, select) }));
      },
      selectDraft: (key, v) => {
        const field = key === 'descDrafts' ? 'problem' : 'explain';
        set((s) => ({ [field]: v.text, [key]: { ...s[key], activeId: v.id } }));
      },

      save: async () => {
        set({ saving: true, saveError: null });
        const s = get();
        try {
          const target = await s.resolveTarget();
          const input = {
            topic: target.topic,
            file: target.file,
            title: s.title.trim(),
            markdown: s.explain.trim(),
            lang: s.lang,
            problem: s.problem.trim(),
            prerequisites: s.prerequisites.trim(),
            code: s.code.trim(),
            output: s.output.trim(),
            priority: s.priority,
          };
          const question = s.editingId
            ? await updateQuestion(s.editingId, input)
            : await addQuestion(input);
          s.onSaved(question, target);
        } catch (err) {
          const saveError =
            err instanceof Error ? err.message : 'Could not save — try again.';
          set({ saveError, saving: false });
        }
      },
    };
  };
};
