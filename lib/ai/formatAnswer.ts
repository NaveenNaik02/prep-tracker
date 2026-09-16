'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface FormatAnswerInput {
  text: string;
  question?: string;
  instructions?: string;
  wantCodeExample?: boolean;
  isImpl?: boolean;
  // Formatting a DSA problem statement rather than an answer.
  isDescription?: boolean;
  lang?: string;
  model?: string;
}

// Reformats rough/pasted text into the app's answer style, without adding or
// removing substance — unlike generateAnswer, this never invents content.
export async function formatAnswer(input: FormatAnswerInput): Promise<string> {
  await requireAuthor('Sign in to format answers');

  const text = input.text.trim();
  if (text.length < 4) throw new Error('Nothing to format yet');

  const contextBits = [
    input.question?.trim() ? `Question: ${input.question.trim()}` : '',
    input.lang && input.lang !== 'none'
      ? `Primary language: ${input.lang}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return gemini({
    system: PROMPTS.formatAnswer(input),
    prompt: `${contextBits ? contextBits + '\n\n' : ''}Reformat this ${input.isDescription ? "problem statement, keeping it a problem statement" : "into the answer's Markdown style"}:\n\n${text}`,
    model: input.model,
    failure: 'Could not format this answer — try again.',
  });
}
