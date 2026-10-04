# AGENTS.md — features/authoring/

Add/edit question modals and their AI wiring. Reference shape for a feature folder (see `components/AGENTS.md`).

- **Own store** (`store/`), separate from `useAppStore`.
- **Opened from `components/AddQuestionFab.tsx`**, which also opens `AddTopicModal`.
- **Draft history is in-memory only** (`AnswerVersion[]`) — a UI convenience, not a DB version table.
- **AI calls go through `lib/ai/` actions**; tests mock each action module individually.
- **Inbox hand-off** — assigning an inbox item reopens the add modal prefilled; saving deletes the source item.
