'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from './result';
import { geminiJson } from './gemini';
import { PROMPTS } from './prompts';

export interface CheckDuplicateInput {
  title: string;
  topic: string;
  file: string;
  // Excludes this question's own row from the comparison set — otherwise
  // checking from the Edit modal always "finds" the question itself.
  excludeId?: string;
  model?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  match: string | null;
  reasoning: string;
}

// Validates the currently entered question against the other questions
// already in the selected topic/subtopic — the list to check against is
// resolved here, from whichever topic/subtopic is selected in the modal at
// the moment Check is clicked, not a fixed section.
export async function checkDuplicateQuestion(
  input: CheckDuplicateInput,
): Promise<AiResult<DuplicateCheckResult>> {
  return attempt(async () => {
    const { supabase } = await requireAuthor('Sign in to check for duplicates');

    const title = input.title.trim();
    if (title.length < 4) throw new Error('Write a question first');

    const { data: existing } = await supabase
      .from('questions')
      .select('id, title')
      .eq('topic', input.topic)
      .eq('file', input.file)
      .order('number');

    const titles = (existing ?? [])
      .filter((r) => r.id !== input.excludeId)
      .map((r) => r.title);

    if (titles.length === 0) {
      return {
        isDuplicate: false,
        match: null,
        reasoning: 'This subtopic has no other questions yet.',
      };
    }

    const parsed = await geminiJson({
      system: PROMPTS.duplicate,
      prompt: `Existing questions:\n${titles.map((t, i) => `${i}. ${t}`).join('\n')}\n\nNew question: "${title}"`,
      model: input.model,
      failure: 'Could not check for duplicates — try again.',
      parseFailure: 'Could not read the duplicate check — try again.',
    });

    const p = parsed as Record<string, unknown>;
    const isDuplicate = p.isDuplicate === true;
    const reasoning = typeof p.reasoning === 'string' ? p.reasoning.trim() : '';
    const matchIndex = typeof p.matchIndex === 'number' ? p.matchIndex : null;
    const match =
      isDuplicate && matchIndex != null ? (titles[matchIndex] ?? null) : null;

    return { isDuplicate, match, reasoning };
  });
}
