# AGENTS.md — lib/actions/

Server actions — plain data mutations. Gemini calls belong in `lib/ai/`. All are online-only: a failed write rolls the store back; there is no queue.

## Question ids & moves

- **Ids are namespaced by section** — `"{topic}/{file}/u-{uuid}"`. Progress and manual order key off the id.
- **A section change mints a new id.** `updateQuestion` / `moveQuestion` never repoint `topic`/`file` on the existing row — it would keep counting toward its old subtopic.
- **`carryOverUserRows()`** (`questions.ts`) moves the acting user's rows to the new id, insert-before-delete for row-presence tables like `progress`. The store mirrors it via `renameProgressId`/`renameOrderId`.
- **`questions.markdown`** keeps raw source so edits reload real Markdown. Older rows fall back to `lib/htmlToMarkdown.ts` (lossy).
- **Layout is driven by columns, not booleans:** non-empty `problem` → Problem → Solution layout; `code` set → code question.

## Topics

`topics.ts` — add/delete topic groups and sections. Deletes refuse while questions are still filed under them.

## Flags & study flow

- **Flags are columns on `questions`** (`starred`, `grey_zone`, `priority`), not join tables — content is owner-scoped, so a per-user join row is redundant. Written via `questionFlags.ts`, read via `lib/db/shortlist.ts`. Don't reintroduce join tables.
- **Set aside** (`setAside.ts`) is the soft delete: insert a full snapshot into `set_aside_items` _before_ deleting from `questions`, so a mid-failure can't lose content; then best-effort clean progress rows.
- **Manual order** — `questionPosition.ts` → `question_position`.
- **Default priority** for new questions — `user_settings.default_priority`.

## Admin

Admin = `app_metadata.is_admin` (never `user_metadata` — only the service role can write `app_metadata`). Admin RLS policies cover **writes only** (edit/delete any question or topic, including ownerless rows); there is no admin read bypass. Client-side, `is_admin` gates the same actions alongside `createdBy === user.id`.
