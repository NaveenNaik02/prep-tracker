import type { StateCreator } from 'zustand';
import { getSavedModel } from '@/lib/ai/models';
import {
  findGroup,
  findGroupForSection,
  sectionUrl,
  type SectionMeta,
  type TopicGroup,
} from '@/lib/content/topics';
import { addSection } from '@/lib/actions/topics';
import { suggestPlacement } from '@/lib/ai/suggestPlacement';
import { matchSubtopic } from '../../utils/matchSubtopic';
import type { DsaInit, DsaState, PlacementSlice } from './types';

// Any string that can't collide with a real section url.
export const STAGED = 'staged:new';

// Placement never leaves the modal's topic. Rebuilt from raw values rather
// than stored, so it can't drift from `groups`.
export const derivePlacement = (
  groups: TopicGroup[],
  targetUrl: string,
  stagedLabel: string | null,
  fixedSection?: SectionMeta,
  groupSlug?: string,
) => {
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
  const section = choices.find((s) => sectionUrl(s) === targetUrl);
  const hasTarget = !!section || targetUrl === STAGED;
  const label = section?.label ?? stagedLabel ?? undefined;
  return { group, choices, section, hasTarget, label };
};

export const placementOf = (s: DsaState) => {
  return derivePlacement(
    s.groups,
    s.targetUrl,
    s.stagedLabel,
    s.fixedSection,
    s.groupSlug,
  );
};

export const createPlacementSlice = (
  init: DsaInit,
): StateCreator<DsaState, [], [], PlacementSlice> => {
  return (set, get) => {
    const { choices } = derivePlacement(
      init.groups,
      '',
      null,
      init.fixedSection,
      init.groupSlug,
    );
    const firstUrl = choices[0] ? sectionUrl(choices[0]) : '';

    const stageNew = (name: string) => {
      set({ stagedLabel: name.trim(), targetUrl: STAGED });
    };

    return {
      groups: init.groups,
      stagedLabel: null,
      targetUrl: init.fixedSection ? sectionUrl(init.fixedSection) : firstUrl,
      history: [],
      at: -1,

      setGroups: (groups) => set({ groups }),
      setTargetUrl: (targetUrl) => set({ targetUrl }),

      // The model is asked to reuse an existing name exactly, and the author
      // may type one — either way an existing subtopic is selected, not
      // duplicated.
      stageOrSelect: (name) => {
        const match = matchSubtopic(placementOf(get()).choices, name);
        if (!match) return stageNew(name);
        set({ stagedLabel: null, targetUrl: sectionUrl(match) });
      },

      suggest: async () => {
        const s = get();
        const { group, choices } = placementOf(s);
        if (!group) return;
        await s.run('section', async () => {
          const next = await suggestPlacement({
            title: s.title.trim(),
            tags: s.prerequisites.trim(),
            description: s.problem.trim(),
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
            // A re-run is told to avoid everything already offered.
            rejected: s.history,
            model: getSavedModel(),
          });
          const history = [...get().history, next];
          set({ history, at: history.length - 1 });
        });
      },

      accept: () => {
        const { history, at, dismiss } = get();
        const suggestion = history[at];
        if (!suggestion) return;
        if (suggestion.mode === 'existing') {
          set({
            stagedLabel: null,
            targetUrl: `/${suggestion.topic}/${suggestion.file}`,
          });
        } else {
          // The topic is fixed here, so a 'new-topic' answer is only useful
          // for the subtopic name it came with.
          stageNew(suggestion.label);
        }
        dismiss();
      },

      // Anything already offered is one step away; only a genuinely new
      // placement costs a call.
      reject: async () => {
        const { history, at, suggest } = get();
        if (at < history.length - 1) set({ at: at + 1 });
        else await suggest();
      },

      back: () => {
        const { at } = get();
        if (at > 0) set({ at: at - 1 });
      },

      dismiss: () => set({ history: [], at: -1 }),

      // Created here rather than when it was suggested, so a cancelled form
      // never leaves an empty subtopic behind.
      resolveTarget: async () => {
        const s = get();
        const { group, section } = placementOf(s);
        if (section) return section;
        const created = await addSection({
          groupSlug: group!.slug,
          label: s.stagedLabel!,
          isDsa: true,
        });
        return created.section;
      },
    };
  };
};
