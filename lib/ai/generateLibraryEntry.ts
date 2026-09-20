'use server';

import { requireAuthor } from '@/lib/supabase/user';
import { gemini } from './gemini';
import { PROMPTS } from './prompts';

export interface LibraryEntryPrompt {
  type: string;
  title: string;
  model?: string;
}

// Writes a Library entry's body from its title — the counterpart of
// generateAnswer for write-ups that answer no particular question.
export async function generateLibraryEntry(
  input: LibraryEntryPrompt,
): Promise<string> {
  await requireAuthor('Sign in to generate entries');

  const title = input.title.trim();
  if (title.length < 2) throw new Error('Add a title first');

  return gemini({
    system: PROMPTS.libraryEntry({ type: input.type }),
    prompt: `Write the entry for: "${title}"`,
    model: input.model,
    failure: 'Could not generate this entry — try again.',
  });
}

// Names an entry from whatever the author has so far: a rough title, the
// content, or just the type when the form is still empty.
export async function suggestLibraryTitle(input: {
  type: string;
  title: string;
  content: string;
}): Promise<string> {
  await requireAuthor('Sign in to generate titles');

  const title = input.title.trim();
  const content = input.content.trim().slice(0, 600);
  const basis = title
    ? `Suggest a cleaner title for this ${input.type}, currently titled "${title}".${content ? `\n\nContent:\n${content}` : ''}`
    : content
      ? `Suggest a title for this ${input.type} based on its content:\n\n${content}`
      : `Suggest a title for a new ${input.type} entry in a developer study library.`;

  const text = await gemini({
    system: PROMPTS.libraryTitle,
    prompt: basis,
    failure: 'Could not suggest a title — try again.',
  });
  return text.trim().replace(/^["']|["']$/g, '');
}
