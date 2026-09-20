import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Markdown -> sanitized HTML in the app's answer style. .q-body only styles
// <h4>, so every heading level is remapped onto it — hand-authored answers,
// generated drafts and Library entries then render identically.
export function renderMarkdown(markdown: string): string {
  if (!markdown.trim()) return '';
  const raw = marked.parse(markdown, { breaks: true }) as string;
  const remapped = raw
    .replace(/<h[1-6]([^>]*)>/gi, '<h4$1>')
    .replace(/<\/h[1-6]>/gi, '</h4>');
  return DOMPurify.sanitize(remapped);
}
