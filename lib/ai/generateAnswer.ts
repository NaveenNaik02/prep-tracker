'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { attempt, type AiResult } from './result';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface GenerateAnswerInput {
  question: string;
  topicName?: string;
  subName?: string;
  instructions?: string;
  wantCodeExample?: boolean;
  model?: string;
}

export async function generateAnswer(
  input: GenerateAnswerInput,
): Promise<AiResult<string>> {
  return attempt(async () => {
    await requireAuthor('Sign in to generate answers');

    const question = input.question.trim();
    if (question.length < 4) throw new Error('Question is too short');

    const contextBits =
      input.topicName && input.subName
        ? `Topic: ${input.topicName} → ${input.subName}\n\n`
        : '';

    return gemini({
      system: PROMPTS.answer(input),
      prompt: `${contextBits}Write the answer to this flashcard question:\n\n"${question}"`,
      model: input.model,
      failure: 'Could not generate an answer — try again.',
    });
  });
}
