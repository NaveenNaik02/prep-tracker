'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from './result';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface GenerateProblemInput {
  question: string;
  lang?: string;
  tags?: string;
  model?: string;
  instructions?: string;
}

export async function generateProblem(
  input: GenerateProblemInput,
): Promise<AiResult<string>> {
  return attempt(async () => {
    await requireAuthor('Sign in to generate a problem statement');

    const question = input.question.trim();
    if (question.length < 4) throw new Error('Question is too short');

    const contextBits = [
      input.lang && input.lang !== 'none' ? `Language: ${input.lang}` : '',
      input.tags?.trim() ? `Tags: ${input.tags.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return gemini({
      system: PROMPTS.problem(input),
      prompt: `${contextBits ? contextBits + '\n\n' : ''}Question: "${question}"`,
      model: input.model,
      failure: 'Could not generate a problem statement — try again.',
    });
  });
}
