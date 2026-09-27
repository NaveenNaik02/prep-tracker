'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from '@/lib/ai/result';
import { geminiJson } from '@/lib/ai/gemini';
import { PROMPTS } from '@/lib/ai/prompts';

// Pasted text (recruiter DM, LinkedIn repost, notes) has no reliable
// structure to regex against — no numbering is guaranteed — so an LLM reads
// it like a person would and pulls out each distinct interview question,
// dropping commentary/preamble. Gated behind sign-in like the other AI
// actions (generateQuestion, suggestPlacement, …), unlike plain capture.
export async function splitInboxText(
  text: string,
  model?: string,
): Promise<AiResult<string[]>> {
  return attempt(async () => {
    await requireAuthor('Sign in to use AI split');

    const trimmed = text.trim();
    if (trimmed.length < 4)
      throw new Error('Write a bit more before splitting');

    const parsed = await geminiJson({
      system: PROMPTS.splitInbox,
      prompt: trimmed,
      model,
      failure: 'Could not split that — try again.',
      parseFailure: 'Could not read the split result — try again.',
    });

    if (!Array.isArray(parsed))
      throw new Error('Could not read the split result — try again.');

    const questions = parsed.map((s) => String(s).trim()).filter(Boolean);
    if (questions.length === 0)
      throw new Error('Could not find any questions in that text.');
    return questions;
  });
}
