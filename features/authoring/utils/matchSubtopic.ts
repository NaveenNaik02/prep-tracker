import type { SectionMeta } from '@/lib/content/topics';

// A name typed by the author or returned by the model can differ from an
// existing subtopic only in case or padding — that's still the same subtopic.
export const matchSubtopic = (choices: SectionMeta[], label: string) => {
  const wanted = label.trim().toLowerCase();
  return choices.find((c) => c.label.toLowerCase() === wanted);
};
