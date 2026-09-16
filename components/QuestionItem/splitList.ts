// `tags` and `prerequisites` are both comma-separated free text.
export function splitList(csv?: string | null): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
