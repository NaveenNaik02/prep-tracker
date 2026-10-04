# AGENTS.md

Guidance for AI coding agents working in this repository.

A **Next.js 16 App Router** app (React 19) backed by **Supabase** (Postgres). Every question, topic, and study record lives in the database — nothing is read from disk at runtime.

**Before working in a folder listed under [Scoped guides](#scoped-guides), read its `AGENTS.md`.**

---

## Rules for agents

- **Never act on the cloud Supabase project.** No `pnpm migrate`, no `scripts/*.js` pointed at cloud, no Management API calls, no service-role writes, no SQL against the cloud DB. Write the migration or script and tell the developer to run it. Local Docker Supabase is the only database an agent may touch.
- **Never reset a database.** No `supabase db reset`, nothing that drops and recreates tables. Schema changes are always incremental migrations.
- **Never commit.** No `git commit`, branch, reset, or rebase unless the developer asks for that specific command in that message — a "yes" to a plan that mentions commits doesn't count. Committing sweeps the developer's own uncommitted work into an agent's commit, and once something stacks on top, undoing it needs a rebase. If a commit split would help, describe it.
- **Stage before starting new work.** At the start of a new request run `git add -A` (stage, never commit), once, before the first edit. Your changes then stay unstaged: `git diff` is this request, `git diff --staged` is everything before. If `git status` shows a partial stage in progress, leave it alone and say so.

## Commands

```bash
pnpm dev          # :3000 against LOCAL Docker Supabase (.env.local.docker)
pnpm db:start     # supabase start — local stack
pnpm db:stop      # supabase stop
pnpm db:psql      # psql into LOCAL Postgres
pnpm db:schema    # regenerate supabase/schema/ from LOCAL
pnpm lint         # ESLint
pnpm test         # Vitest, single run
pnpm build        # production build
```

pnpm is the package manager (`pnpm-lock.yaml`; no `package-lock.json`). `pnpm dev:remote`, `pnpm migrate`, `set-admin`, and `pull-remote` hit the cloud — developer-only, see `docs/ops.md`. No route auto-provisions a session; log in at `/login`.

---

## Rules that hold everywhere

- **Content is owner-scoped by RLS.** Every account sees only rows it created (`created_by = auth.uid()`); ownerless rows are unreadable; admins get no read bypass. Queries carry no `.eq('created_by', …)` — `lib/supabase/server.ts`'s `createClient()` uses the caller's session and the DB filters.
- **Never use the service-role client on a read path.** It bypasses RLS — the one thing that actually breaks the model.
- **Every route is gated.** `lib/supabase/middleware.ts` redirects non-users to `/login`; only `/login`, `/signup`, `/auth/*`, `/manifest.json` are exempt. Authoring and AI actions also call `requireAuthor()` (`lib/supabase/user.ts`) as defence in depth.
- **The DB is the only curriculum.** Don't add a static topics constant.
- **The app store is never a module singleton** — one per request tree. See `lib/stores/AGENTS.md`.
- **Mutations are online-only.** No service worker, no localStorage write queue — the app is installable (`public/manifest.json`), not offline-capable. Don't re-add either without a deliberate decision.
- **Schema changes go in a new migration**, never in `supabase/schema/` (generated). See `supabase/AGENTS.md`.

---

## Layout

- `app/(app)/` — everything behind the login gate; `app/login`, `app/signup`, `app/auth/callback` outside it.
- `features/<name>/` — one folder per feature; entry component at the root, `components/ db/ actions/ hooks/ store/` nested, public surface in `index.ts`. Import from `@/features/<name>`, never a deep path.
- `lib/` — shared code: `actions/` (mutations), `ai/` (Gemini), `content/` (curriculum), `db/` (queries), `stores/`, `supabase/`, `hooks/`, `context/`.
- `components/` — feature-independent UI; `components/ui/` is shadcn.
- `design/` — standalone prototypes, never built. **`app.jsx` is the source of truth** for what a page looks like; the `*.html` files are option explorations — use one only when `app.jsx` doesn't cover that screen.

## Scoped guides

| Folder                            | Covers                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `components/AGENTS.md`            | feature-first organisation, when to split a file, keeping root components feature-independent |
| `features/authoring/AGENTS.md`    | question modals, own store, draft history                                                     |
| `features/section-view/AGENTS.md` | drag reorder                                                                                  |
| `lib/actions/AGENTS.md`           | question ids & moves, flags, set aside, admin                                                 |
| `lib/ai/AGENTS.md`                | Gemini boundary, re-validating model output, instruction presets                              |
| `lib/content/AGENTS.md`           | curriculum loading, dynamic routing rules                                                     |
| `lib/stores/AGENTS.md`            | store construction, seeding, consumption                                                      |
| `supabase/AGENTS.md`              | migrations, generated schema, local stack                                                     |
| `docs/ops.md`                     | developer runbook — env, tokens, CI/CD, cloud scripts                                         |

---

## Conventions

- **React imports** — automatic JSX runtime. Don't `import React` unless you use the namespace; import hooks directly.
- **Exports** — always named, never default, except where a framework demands it (Next route files, `next/dynamic` targets, config files).
- **Hooks** — feature-only hooks in that feature's `hooks/`; shared ones in `lib/hooks/` (`@/lib/hooks`). Nothing hook-shaped loose at `lib/` root.
- **State locality** — keep state local; lift only when necessary. Don't pass store data as props when the child can read `useAppStore` itself.
- **Naming** — the shortest name that answers "what is this?" alone: `canCheckDuplicate`, `resolveTargetSection`. No context-dependent names (`data`, `handle`, `tmp`), no padding. Drop words the context supplies (inside `usePlacement`, `pending` beats `pendingPlacement`). Booleans as assertions (`isImpl`), functions as verbs (`suggest`).
- **Arrow bodies** — if the body doesn't fit on the `=>` line, use a block body with `return`; never a concise body wrapped to the next line. `=> (` and `=> ({` are exempt. New code only.
- **Named intermediates** — any value needing a ternary, chained `.some()/.find()`, or multiple lines gets a named `const` above the `return`, so object literals and JSX props read as a plain list of fields. New code only.

  ```ts
  // no
  return {
    activeId: presets.some((p) => p.id === row.active_id)
      ? row.active_id
      : presets[0].id,
  };
  // yes
  const savedIdExists = presets.some((p) => p.id === row.active_id);
  const activeId = savedIdExists ? row.active_id : presets[0].id;
  return { activeId };
  ```
