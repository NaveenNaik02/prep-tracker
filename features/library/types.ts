export type LibraryType =
  | 'algorithm'
  | 'pattern'
  | 'data-structure'
  | 'concept'
  | 'technique'
  | 'cheatsheet'
  | 'note';

export interface LibraryEntry {
  id: string;
  type: LibraryType;
  title: string;
  content: string;
  shareToken: string;
  updatedAt: string;
}

// Hues feed the same oklch pattern the topic badges use, so a tag picks up
// each theme's lightness instead of carrying its own colours.
export const LIB_TYPES: { value: LibraryType; label: string; hue: number }[] = [
  { value: 'algorithm', label: 'Algorithm', hue: 256 },
  { value: 'pattern', label: 'Pattern', hue: 300 },
  { value: 'data-structure', label: 'Data Structure', hue: 200 },
  { value: 'concept', label: 'Concept', hue: 150 },
  { value: 'technique', label: 'Technique', hue: 65 },
  { value: 'cheatsheet', label: 'Cheatsheet', hue: 25 },
  { value: 'note', label: 'Note', hue: 330 },
];

export const libType = (type: LibraryType) => {
  return LIB_TYPES.find((t) => t.value === type) ?? LIB_TYPES[0];
};

// Card subtitle: the opening prose with Markdown punctuation stripped, so a
// write-up that starts with a heading still previews its first sentence.
export const libBlurb = (content: string) => {
  const plain = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#.*$/gm, '')
    // List markers only — a hyphen mid-word ("divide-and-conquer") is text.
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[#*`_>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 140);
};
