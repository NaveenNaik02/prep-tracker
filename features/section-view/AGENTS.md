# AGENTS.md — features/section-view/

The question list for one subtopic — filters, drag reorder, bulk ops.

- **Drag reorder** (`hooks/useSectionDrag.ts`) — native Pointer Events, no drag library: a floating clone follows the pointer; the drop slot comes from pointer Y against each row's midpoint. Enabled only in `'manual'` sort with no active filters. Persists via `lib/actions/questionPosition.ts`.
- **Mouse-only on purpose** — `if (e.pointerType !== 'mouse') return` keeps dragging from fighting touch scroll. Don't "fix" it for touch.
