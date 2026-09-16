import { isCodeOutputSection, type TopicGroup, type SectionMeta } from '@/lib/content/topics';
import {
  PENDING_GROUP_SLUG,
  PENDING_SECTION_KEY,
  type PendingPlacement,
} from '../types';

export const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`;

export interface PlacementOption {
  value: string;
  label: string;
  // Badges the option as a topic/subtopic that doesn't exist yet.
  sub?: string;
}

const newOption = (value: string, label: string): PlacementOption => ({
  value,
  label,
  sub: 'new',
});

// The two dropdowns' contents for a given selection. A staged topic/subtopic
// appears as a synthetic option carrying a sentinel value — it has no slug or
// section key of its own until Save creates it.
//
// Pure on purpose: this is the fiddliest logic in the placement flow, and
// keeping it out of the hook is what makes it testable.
export const buildPlacementOptions = (
  groups: TopicGroup[],
  groupSlug: string,
  pending: PendingPlacement | null,
) => {
  const pendingTopic = pending?.mode === 'new-topic' ? pending : null;
  const isPendingGroup = groupSlug === PENDING_GROUP_SLUG;
  const group = isPendingGroup
    ? null
    : (groups.find((g) => g.slug === groupSlug) ?? groups[0]);

  // A staged subtopic only belongs in the list while its parent topic is the
  // one selected — switching topics hides it without discarding it.
  const pendingSubtopic =
    pending?.mode === 'new-subtopic' && pending.groupSlug === groupSlug
      ? pending
      : null;

  const topicOptions: PlacementOption[] = groups.map((g) => ({
    value: g.slug,
    label: g.groupName,
  }));
  if (pendingTopic) {
    topicOptions.push(newOption(PENDING_GROUP_SLUG, pendingTopic.topicName));
  }

  // A staged new topic has exactly one subtopic — the one staged with it.
  if (pendingTopic && isPendingGroup) {
    return {
      group,
      topicOptions,
      sectionOptions: [newOption(PENDING_SECTION_KEY, pendingTopic.label)],
    };
  }

  // Neither the code-output subtopic nor a DSA one is a placement target
  // here: they take code and DSA questions, authored through their own
  // modals, and this form supplies neither a snippet nor a description.
  const sectionOptions: PlacementOption[] = (group?.sections ?? [])
    .filter((s) => !isCodeOutputSection(s) && !s.isDsa)
    .map((s) => ({
      value: sectionKey(s),
      label: s.label,
    }));
  if (pendingSubtopic) {
    sectionOptions.push(newOption(PENDING_SECTION_KEY, pendingSubtopic.label));
  }

  return { group, topicOptions, sectionOptions };
};
