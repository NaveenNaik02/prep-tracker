'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from './result';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface GenerateQuestionInput {
  topicName: string;
  subName?: string;
  seed?: string;
  isImpl?: boolean;
  lang?: string;
  tags?: string;
  model?: string;
  instructions?: string;
}

export async function generateQuestion(
  input: GenerateQuestionInput,
): Promise<AiResult<string>> {
  return attempt(async () => {
    await requireAuthor('Sign in to generate questions');

    const contextBits = [
      input.subName
        ? `Topic: ${input.topicName} → ${input.subName}`
        : `Topic: ${input.topicName}`,
      input.lang && input.lang !== 'none' ? `Language: ${input.lang}` : '',
      input.tags?.trim() ? `Tags: ${input.tags.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const seed = input.seed?.trim()
      ? `\n\nDraft question to work from — apply the instructions above to it rather than ignoring it: "${input.seed.trim()}"`
      : '';

    const text = await gemini({
      system: PROMPTS.question(input),
      prompt: `${contextBits}${seed}`,
      model: input.model,
      failure: 'Could not generate a question — try again.',
    });
    return text.replace(/^["']|["']$/g, '');
  });
}
