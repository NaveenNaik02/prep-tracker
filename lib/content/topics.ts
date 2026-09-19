export interface SectionMeta {
  topic: string; // folder path relative to repo root, e.g. "javascript", "react/ecosystem"
  file: string; // filename without .md, e.g. "foundations", "redux"
  label: string; // display name
  // Holds DSA problems — description, prerequisites, solution/output/explanation.
  // Unlike the code-output subtopic this is a plain flag, not a reserved slug:
  // a topic can have as many DSA subtopics as it likes, each slugified normally.
  isDsa?: boolean;
}

export interface TopicGroup {
  groupName: string;
  slug: string; // single URL segment, e.g. "javascript"
  sections: SectionMeta[];
  blurb?: string;
  // Every subtopic added under this topic becomes a DSA subtopic automatically.
  isDsa?: boolean;
  // ISO timestamp of when the topic was pinned; absent when it isn't pinned.
  // A timestamp rather than a flag so pinned topics can keep the order they
  // were pinned in.
  pinnedAt?: string;
}

// A topic's code-output subtopic is an ordinary `sections` row created from
// Add Subtopic's toggle, but its `file` is always this reserved slug rather
// than one derived from the name the user typed. The underscore is
// deliberate: slugify() collapses every non-alphanumeric character to "-", so
// no ordinary subtopic can ever produce it — it can't collide with the
// pre-existing "output-questions" sections, which stay ordinary subtopics.
// sections' primary key is (topic, file), so this also caps a topic at one.
export const CODE_OUTPUT_FILE = 'code_output';
export const CODE_OUTPUT_LABEL = 'Code Output';

export function isCodeOutputSection(section: SectionMeta): boolean {
  return section.file === CODE_OUTPUT_FILE;
}

// Pinned topics lead, oldest pin first, so they read in the order they were
// pinned. Unpinned topics fall through to the array's existing creation order,
// which a stable sort preserves. ISO-8601 strings compare chronologically.
export function byPinnedFirst(a: TopicGroup, b: TopicGroup): number {
  if (a.pinnedAt && b.pinnedAt) return a.pinnedAt.localeCompare(b.pinnedAt);
  return Number(!!b.pinnedAt) - Number(!!a.pinnedAt);
}

export function findGroup(
  groups: TopicGroup[],
  slug: string,
): TopicGroup | null {
  return groups.find((g) => g.slug === slug) ?? null;
}

export function sectionPath(
  segments: string[],
): Pick<SectionMeta, 'topic' | 'file'> {
  return {
    topic: segments.slice(0, -1).join('/'),
    file: segments[segments.length - 1],
  };
}

export function findSection(
  groups: TopicGroup[],
  segments: string[],
): SectionMeta | null {
  const { topic, file } = sectionPath(segments);
  for (const group of groups) {
    const section = group.sections.find(
      (s) => s.topic === topic && s.file === file,
    );
    if (section) return section;
  }
  return null;
}

export function findGroupForSection(
  groups: TopicGroup[],
  section: SectionMeta,
): TopicGroup | null {
  return (
    groups.find((g) =>
      g.sections.some(
        (s) => s.topic === section.topic && s.file === section.file,
      ),
    ) ?? null
  );
}

export function sectionUrl(section: SectionMeta): string {
  return `/${section.topic}/${section.file}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'topic'
  );
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
