'use server';

import { requireAuthor } from '@/lib/supabase/user';
import type { PriorityLevel } from '@/lib/types';
import { geminiJson } from './gemini';
import { PROMPTS } from './prompts';
import { BULK_FIELDS, type DsaDraft, type DsaField } from './dsaFields';

export interface GenerateDsaInput {
  title: string;
  lang?: string;
  // Named so a generated title suits where the question is being filed.
  subtopic?: string;
  // The subtopics already under this topic — a generated `subtopic` should
  // reuse one of these by name rather than inventing a near-duplicate.
  subtopics?: string[];
  // Whatever the author already has. Sent so a single regenerated field agrees
  // with the rest of the question instead of describing a different one.
  description?: string;
  code?: string;
  fields?: readonly DsaField[];
  model?: string;
}

const DIFFICULTY: Record<string, PriorityLevel> = {
  easy: 'low',
  medium: 'med',
  hard: 'high',
};

// The model is told which keys to send, but it can still omit one, send an
// array where a string was asked for, or invent a difficulty — so read only
// the requested keys and only in the shapes the form can use.
function readDraft(parsed: unknown, fields: readonly DsaField[]): DsaDraft {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Could not read the generated question — try again.');
  }
  const raw = parsed as Record<string, unknown>;
  const text = (v: unknown): string | undefined => {
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const list = (v: unknown): string | undefined => {
    if (Array.isArray(v)) {
      const items = v.filter((i): i is string => typeof i === 'string');
      return items.length ? items.join(', ') : undefined;
    }
    return text(v);
  };

  const draft: DsaDraft = {};
  for (const field of fields) {
    if (field === 'prerequisites') {
      draft[field] = list(raw[field]);
    } else if (field === 'difficulty') {
      const level = text(raw.difficulty)?.toLowerCase() ?? '';
      draft.difficulty = DIFFICULTY[level];
    } else {
      draft[field] = text(raw[field]);
    }
  }
  return draft;
}

// One request whatever the caller asks for: the whole question from its title,
// or a single field being regenerated.
export async function generateDsaQuestion(
  input: GenerateDsaInput,
): Promise<DsaDraft> {
  await requireAuthor('Sign in to use AI generation');

  const title = input.title.trim();
  const fields = input.fields?.length ? input.fields : BULK_FIELDS;
  // Every field but the title is generated *from* the title, so only they
  // require one to exist.
  if (!fields.includes('title') && title.length < 4) {
    throw new Error('Add a question header first');
  }

  const context = [
    title ? `Problem: ${title}` : '',
    input.subtopic?.trim() ? `Subtopic: ${input.subtopic.trim()}` : '',
    input.subtopics?.length
      ? `Existing subtopics: ${input.subtopics.join(', ')}`
      : '',
    input.lang && input.lang !== 'none' ? `Language: ${input.lang}` : '',
    input.description?.trim()
      ? `Existing description: ${input.description.trim()}`
      : '',
    input.code?.trim() ? `Existing solution:\n${input.code.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const parsed = await geminiJson({
    system: PROMPTS.dsaQuestion(fields),
    prompt: context,
    model: input.model,
    failure: 'Could not generate — try again.',
    parseFailure: 'Could not read the generated question — try again.',
  });

  return readDraft(parsed, fields);
}
