// `tags` and `prerequisites` are both comma-separated free text.
export function splitList(csv?: string | null): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Prereq {
  text: string;
  // A URL the author attached to this item. Library concepts carry no link —
  // they're matched by name where the Library index is available.
  link?: string;
}

// One prerequisite is `name` or `name|url`, and the list stays comma-separated
// so every existing reader of the column keeps seeing plain text.
// ponytail: a URL containing a comma would split in two — switch the column to
// jsonb if that ever shows up in practice.
export function parsePrereqs(csv?: string | null): Prereq[] {
  return splitList(csv)
    .map((item) => {
      const bar = item.indexOf('|');
      if (bar === -1) return { text: item };
      const text = item.slice(0, bar).trim();
      const link = item.slice(bar + 1).trim();
      return link ? { text: text || link, link } : { text };
    })
    .filter((p) => p.text);
}

export function formatPrereqs(list: Prereq[]): string {
  return list
    .map((p) => (p.link ? `${p.text}|${p.link}` : p.text))
    .join(', ');
}
