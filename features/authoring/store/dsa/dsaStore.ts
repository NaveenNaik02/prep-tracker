'use client';

import { createContext, useContext, useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { BULK_FIELDS, type DsaField } from '@/lib/ai/dsaFields';
import { createFieldsSlice } from './fieldsSlice';
import { createAiSlice } from './aiSlice';
import { createPlacementSlice, derivePlacement } from './placementSlice';
import type { DsaInit, DsaState } from './types';

// One store per open DSA modal, for the same reasons as createAuthoringStore:
// the draft dies with the modal, and no open inherits the previous one's.
// Separate from that store because the DSA form shares none of its slices —
// no duplicate check, two draft histories, placement inside one topic.
export const createDsaStore = (init: DsaInit) => {
  return createStore<DsaState>()((...a) => ({
    ...createFieldsSlice(init)(...a),
    ...createAiSlice(...a),
    ...createPlacementSlice(init)(...a),
    isEditing: !!init.editing,
    editingId: init.editing?.id,
    fixedSection: init.fixedSection,
    groupSlug: init.groupSlug,
    onSaved: init.onSaved,
  }));
};

export type DsaStoreApi = ReturnType<typeof createDsaStore>;

export const DsaContext = createContext<DsaStoreApi | null>(null);

export const useDsaApi = (): DsaStoreApi => {
  const store = useContext(DsaContext);
  if (!store) throw new Error('useDsa must be used within a DsaStoreProvider');
  return store;
};

export const useDsa = <T>(selector: (s: DsaState) => T): T => {
  return useStore(useDsaApi(), selector);
};

// Memoised because it returns fresh arrays, which would otherwise re-render
// on every unrelated store change.
export const usePlacementView = () => {
  const groups = useDsa((s) => s.groups);
  const targetUrl = useDsa((s) => s.targetUrl);
  const stagedLabel = useDsa((s) => s.stagedLabel);
  const fixedSection = useDsa((s) => s.fixedSection);
  const groupSlug = useDsa((s) => s.groupSlug);
  return useMemo(() => {
    return derivePlacement(
      groups,
      targetUrl,
      stagedLabel,
      fixedSection,
      groupSlug,
    );
  }, [groups, targetUrl, stagedLabel, fixedSection, groupSlug]);
};

export const selectHasTitle = (s: DsaState) => s.title.trim().length > 3;
export const selectHasCode = (s: DsaState) => s.code.trim().length > 3;
export const selectAnyBusy = (s: DsaState) => s.busy !== null || s.streaming;

// Editing never fills the subtopic: retargeting it here would move the
// question on save (new id, progress carried over) as a side effect of
// "fill the form", which is not what the button says it does.
export const bulkFieldsFor = (isEditing: boolean): DsaField[] => {
  return isEditing ? [...BULK_FIELDS] : ['subtopic', ...BULK_FIELDS];
};

export const useFieldError = (field: string) => {
  return useDsa((s) =>
    s.genError?.field === field ? s.genError.message : null,
  );
};
