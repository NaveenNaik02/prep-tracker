'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { geminiJson } from './gemini';
import { PROMPTS } from './prompts';

export interface SuggestPlacementGroup {
  groupSlug: string;
  groupName: string;
  sections: { topic: string; file: string; label: string }[];
}

export interface SuggestPlacementInput {
  title: string;
  tags?: string;
  // The problem statement, for titles too terse to place on their own.
  description?: string;
  groups: SuggestPlacementGroup[];
  model?: string;
  // Placements the author has already turned down in this session. Sent back
  // so a re-run has to find a different home rather than repeat itself.
  rejected?: PlacementSuggestion[];
}

export type PlacementSuggestion =
  | {
      mode: 'existing';
      groupSlug: string;
      topic: string;
      file: string;
      reasoning: string;
    }
  | {
      mode: 'new-subtopic';
      groupSlug: string;
      label: string;
      reasoning: string;
    }
  | {
      mode: 'new-topic';
      topicName: string;
      blurb: string;
      label: string;
      reasoning: string;
    };

// Rejected placements go in as prose rather than identifiers: the model only
// has to avoid them, not echo them back, and naming them the way the tree
// does is enough for that.
function describe(s: PlacementSuggestion): string {
  if (s.mode === 'existing') {
    return `the existing subtopic (topic: "${s.topic}", file: "${s.file}")`;
  }
  if (s.mode === 'new-subtopic') {
    return `a new subtopic "${s.label}" under groupSlug "${s.groupSlug}"`;
  }
  return `a new topic "${s.topicName}" with subtopic "${s.label}"`;
}

// Serializes the curriculum with the exact identifiers (groupSlug/topic/file)
// the model must echo back for an "existing" match — keeps the response
// parseable/verifiable instead of asking it to reproduce free-text names.
function buildTree(groups: SuggestPlacementGroup[]): string {
  return groups
    .map(
      (g) =>
        `- ${g.groupName} (groupSlug: "${g.groupSlug}")\n` +
        g.sections
          .map((s) => `  - ${s.label} (topic: "${s.topic}", file: "${s.file}")`)
          .join('\n'),
    )
    .join('\n');
}

export async function suggestPlacement(
  input: SuggestPlacementInput,
): Promise<PlacementSuggestion> {
  await requireAuthor('Sign in to use AI placement');

  const title = input.title.trim();
  if (title.length < 4) throw new Error('Write a question first');

  // Capped so a long problem statement can't crowd out the tree and the
  // rejected list, which are what actually decide the placement.
  const description = input.description?.trim().slice(0, 1200) ?? '';

  const parsed = await geminiJson({
    system: PROMPTS.placement,
    prompt:
      `Existing curriculum:\n${buildTree(input.groups)}\n\nNew question: "${title}"` +
      (input.tags?.trim() ? `\nTags: ${input.tags.trim()}` : '') +
      (description ? `\nDescription: ${description}` : '') +
      (input.rejected?.length
        ? `\n\nRejected:\n${input.rejected.map((r) => `- ${describe(r)}`).join('\n')}`
        : ''),
    model: input.model,
    // Low thinking force-fits the nearest existing subtopic instead of
    // proposing a new one — the only call here worth the extra tokens.
    thinkingLevel: 'high',
    failure: 'Could not get a placement suggestion — try again.',
    parseFailure: 'Could not read the placement suggestion — try again.',
  });

  return validate(parsed, input.groups);
}

// The model only ever sees identifiers we handed it, but it can still
// hallucinate a slug/topic/file that doesn't exist — re-check against the
// real tree before trusting an "existing" match.
function validate(
  parsed: unknown,
  groups: SuggestPlacementGroup[],
): PlacementSuggestion {
  const bad = () =>
    new Error('Could not get a placement suggestion — try again.');
  if (!parsed || typeof parsed !== 'object') throw bad();
  const p = parsed as Record<string, unknown>;
  const reasoning = typeof p.reasoning === 'string' ? p.reasoning.trim() : '';

  if (p.mode === 'existing') {
    const groupSlug = String(p.groupSlug ?? '');
    const topic = String(p.topic ?? '');
    const file = String(p.file ?? '');
    const group = groups.find((g) => g.groupSlug === groupSlug);
    const section = group?.sections.find(
      (s) => s.topic === topic && s.file === file,
    );
    if (!group || !section) throw bad();
    return { mode: 'existing', groupSlug, topic, file, reasoning };
  }

  if (p.mode === 'new-subtopic') {
    const groupSlug = String(p.groupSlug ?? '');
    const label = String(p.label ?? '').trim();
    const group = groups.find((g) => g.groupSlug === groupSlug);
    if (!group || label.length < 2) throw bad();
    return { mode: 'new-subtopic', groupSlug, label, reasoning };
  }

  if (p.mode === 'new-topic') {
    const topicName = String(p.topicName ?? '').trim();
    const label = String(p.label ?? '').trim();
    const blurb = typeof p.blurb === 'string' ? p.blurb.trim() : '';
    if (topicName.length < 2 || label.length < 2) throw bad();
    return { mode: 'new-topic', topicName, blurb, label, reasoning };
  }

  throw bad();
}
