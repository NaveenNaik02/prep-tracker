# AGENTS.md — lib/ai/

Everything Gemini-facing lives here, leaving `lib/actions/` as plain data mutations.

- **`gemini.ts` is the only file that calls Google's REST API** (no SDK). It owns `FREE_GEM_API_KEY`, model validation, and error handling. `gemini()` for text, `geminiJson()` when the prompt asks for JSON (sets `responseMimeType`, strips code fences).
- **`gemini.ts` does no auth.** Each `'use server'` action calls `requireAuthor()` itself — the failure message is per-action, and some (`checkDuplicate`) need the `supabase` client it returns.
- **`prompts.ts` holds only role + output contract.** Style guidance is the author's, from `lib/instructionPresets.ts` (user-editable, picked by `kind`: `text` vs `code`).
- **`models.ts`** — the shared model list and default, plus `AUTO_RUN_MODEL`.
- **Re-validate model JSON server-side.** `suggestPlacement` and `checkDuplicate` check returned ids against the real curriculum/questions — the model can return well-formed JSON naming ids that don't exist.
- **No barrel file here.** Tests mock each action module individually; a barrel would collapse them into one whole-module mock.
- `features/inbox/actions/splitInboxText.ts` is another Gemini caller, kept with its feature.

## Instruction presets (`lib/instructionPresets.ts`)

- Selected automatically by `kind`, not one global active preset.
- Four protected built-ins (`default-text`, `default-code`, `default-suggestion`, `default-problem`) can't be deleted; `migratePresets()` backfills missing ones.
- Stored in `user_settings.instruction_presets` (jsonb) + `active_instruction_preset_id`; `settingsSlice.hydrateSettings` bootstraps from localStorage when there's no row.
