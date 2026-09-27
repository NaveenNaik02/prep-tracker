'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from './result';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

// Small sibling of generateAnswer.ts for the Add Topic modal's "Generate"
// blurb button — no model picker (this text is short enough that model
// choice isn't worth a UI control here).
export async function generateTopicBlurb(
  topicName: string,
): Promise<AiResult<string>> {
  return attempt(async () => {
    await requireAuthor('Sign in to generate a blurb');

    const name = topicName.trim();
    if (name.length < 2) throw new Error('Topic name is too short');

    const text = await gemini({
      system: PROMPTS.blurb,
      prompt: `Topic: "${name}"`,
      failure: 'Could not generate a blurb — try again.',
    });
    return text.replace(/^"|"$/g, '');
  });
}
