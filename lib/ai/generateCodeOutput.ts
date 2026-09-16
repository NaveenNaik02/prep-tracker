'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface CodeGenerationInput {
  code: string;
  lang?: string;
  // Only used by the explanation prompt — knowing the expected output keeps
  // it from having to derive one, and from contradicting the saved value.
  output?: string;
  model?: string;
  // DSA context — the problem being solved. Ignored by the other two prompts,
  // which describe a snippet rather than a solution.
  title?: string;
  // The explanation's formatting instructions — the 'code-explanation'
  // instruction preset, editable per-question and in Settings. Ignored by
  // generateCodeOutput: raw output has no formatting to steer.
  instructions?: string;
}

async function run(
  input: CodeGenerationInput,
  system: string,
  contextBits: string[],
  failure: string,
): Promise<string> {
  await requireAuthor('Sign in to use AI generation');

  const code = input.code.trim();
  if (code.length < 4) throw new Error('Code snippet is too short');

  return gemini({
    system,
    prompt: `${contextBits.filter(Boolean).join('\n')}\n\nCode:\n${code}`,
    model: input.model,
    failure,
  });
}

const langLine = (lang?: string) => {
  return lang && lang !== 'none' ? `Language: ${lang}` : '';
};

export async function generateCodeOutput(
  input: CodeGenerationInput,
): Promise<string> {
  return run(
    input,
    PROMPTS.codeOutput,
    [langLine(input.lang)],
    'Could not work out the output — try again.',
  );
}

export async function generateCodeExplanation(
  input: CodeGenerationInput,
): Promise<string> {
  return run(
    input,
    PROMPTS.codeExplanation(input),
    [
      langLine(input.lang),
      input.output?.trim()
        ? `Output: ${input.output.trim()}`
        : 'Output: (not specified — determine it yourself as part of the explanation)',
    ],
    'Could not generate an explanation — try again.',
  );
}

export async function generateDsaExplanation(
  input: CodeGenerationInput,
): Promise<string> {
  return run(
    input,
    PROMPTS.dsaExplanation(input),
    [
      langLine(input.lang),
      input.title?.trim() ? `Problem: ${input.title.trim()}` : '',
    ],
    'Could not generate an explanation — try again.',
  );
}
