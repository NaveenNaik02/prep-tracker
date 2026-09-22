# AGENTS.md

Guidance for AI coding agents (Claude Code, Gemini, etc.) working in this repository.

A **Next.js 16 App Router** app (React 19) backed by **Supabase** (Postgres). Every question, topic, and study record lives in the database — nothing is read from disk at runtime.

---

## Rules for agents

- **Never act on the cloud Supabase project.** No `pnpm migrate`, no `scripts/*.js` pointed at cloud, no Management API calls, no service-role writes, no SQL against the cloud DB. Write the migration or script and tell the user to run it. Local Docker Supabase is the only database an agent may touch.
- **Never reset a database.** No `supabase db reset`, no command or script that drops and recreates tables — it destroys local dev data. Schema changes are always incremental migrations.
- **Never commit.** Finish the work and leave it in the working tree — no `git commit`, branch, reset, or rebase unless the developer asks for that specific command in that message. Generating code is not permission to commit it, and neither is a "yes" to a plan that mentioned commits. The developer reviews every diff and commits it themselves. Staging is the one exception, and only as the checkpoint below.

  Two failure modes this prevents. First, committing sweeps up whatever uncommitted work is already in the tree, burying the developer's own changes inside an agent's commit under an agent's message. Second, once an agent's commit has anything stacked on top of it, undoing it needs a rebase rather than a reset — a cheap mistake becomes an expensive one.

  If a commit split would genuinely help, describe the split and let the developer make it.

- **Stage before starting new work.** At the start of a new request, run `git add -A` — stage, never commit. Everything you then change stays unstaged, so the developer can see the current request's work in isolation:

  ```bash
  git diff              # just this request
  git diff --staged     # everything that came before
  git diff HEAD         # all uncommitted work together
  ```

  Run it once, before the first edit — not between edits, or the boundary you just drew disappears. Check `git status` first: if the developer has a partial stage in progress (some files staged, others deliberately not), leave it alone and say so, because `git add -A` would erase that intent.

## Commands

```bash
pnpm dev          # Dev server on :3000 against LOCAL Docker Supabase
pnpm dev:remote   # Dev server on :3010 against the CLOUD project
pnpm db:start     # supabase start — local Docker stack (Postgres/GoTrue/Studio)
pnpm db:stop      # supabase stop
pnpm db:studio    # open Supabase Studio for the LOCAL stack — off by default, see below
pnpm db:psql      # psql shell into the LOCAL Docker Postgres (never cloud)
pnpm db:schema    # regenerate supabase/schema/ from the LOCAL stack
pnpm build        # Production build
pnpm start        # Serve production build
pnpm lint         # ESLint (flat config, eslint.config.mjs)
pnpm test         # Vitest, single run (vitest.config.ts)
pnpm skills:install  # restore third-party agent skills from skills-lock.json
```

- **pnpm is the package manager.** `packageManager` in `package.json` pins `pnpm@10.11.0` and `pnpm-lock.yaml` is the committed lockfile — there is no `package-lock.json`. CI and the deploy workflow run `pnpm install --frozen-lockfile`; Vercel picks pnpm up from the lockfile on its own. `pnpm install` warns that it ignored build scripts for `esbuild`, `sharp`, and `unrs-resolver`; that's cosmetic, since all three ship prebuilt platform binaries and lint/test/build pass without them.
- **`pnpm dev` never touches the cloud.** It sources `.env.local.docker`, which points `NEXT_PUBLIC_SUPABASE_URL` at `http://127.0.0.1:54321` — the local Docker stack, nothing else.
- **`pnpm dev:remote` is the one that hits the real project.** `DEV_REMOTE=1` switches the app to `.env.local`.
- **Both can run at once.** `DEV_REMOTE` also flips `distDir` to `.next-remote` (vs. plain `dev`'s `.next`), so the two servers never fight over a build-dir lock. See `next.config.js`.
- **Neither auto-provisions a session.** Local and prod both require a real login at `/login`.
- **The local stack runs a trimmed set of services.** `supabase/config.toml` disables `realtime`, `storage`, `inbucket`, `edge_runtime`, `analytics`, and `studio` — ~11 containers down to ~4, because the app only ever talks to Postgres, GoTrue, and PostgREST. Re-enable one by flipping its `enabled` flag and running `pnpm db:stop && pnpm db:start`; the flags only take effect on a fresh start. Day-to-day data browsing is `pnpm db:psql`, and `pnpm db:studio` probes port 54323 first, so it prints how to turn Studio back on instead of opening a dead tab.

- **The local account is yours to create.** Nothing seeds it — `supabase/seed.sql` only adds an RLS policy. Sign up once at `/signup` with the `DEV_USER` / `DEV_PW` values from `.env.local`. `scripts/pull-remote.js` then finds that account by email to re-own the rows it imports, so the address has to match `DEV_USER` exactly.

### Scripts

```bash
pnpm migrate      # Apply pending supabase/migrations/*.sql to the CLOUD project
pnpm set-admin    # scripts/set-admin.js <email> [--revoke]
pnpm pull-remote  # Copy CLOUD data into local Docker, re-owned to DEV_USER
```

One more is run by hand, a one-time fixup from the owner-scoped pivot:

- `node --env-file=.env.local scripts/reassign-owner.js <from-email> <to-email>` — moves all content and study data from one account to another (e.g. questions authored under an old OAuth account onto a new one). Excludes `user_settings`, which stays per-account.

(`scripts/backfill-static-sections.js` was its sibling — it created `sections` rows for the static curriculum's subtopics, which had none and so were unreachable once reads became owner-scoped. It finished its job on cloud and was deleted along with the `TOPIC_GROUPS` constant it read.)

`scripts/pull-remote.js` is upsert-only and never writes to the remote. It derives the `sections` rows it needs from the questions it imports.

### Environment

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ACCESS_TOKEN` (a personal access token, used by `scripts/migrate.js`). AI authoring additionally needs `FREE_GEM_API_KEY`.

**`SUPABASE_ACCESS_TOKEN` expires, and lives in two places.** It is a Supabase personal access token (`sbp_…`) with a real expiry date and no warning before it passes. It is needed in **both** `web/.env.local` (local `migrate` / `set-admin` / `pull-remote`) and as the repo's `SUPABASE_ACCESS_TOKEN` GitHub secret (`deploy.yml`) — update both together, or the next deploy fails even though local works.

When it lapses, the deploy's "Run database migrations" step fails with `401 Unauthorized` from the Management API and nothing else. `scripts/migrate.js` special-cases that status and prints what to do. Manage tokens at <https://supabase.com/dashboard/account/tokens>.

| Rotated on | Expires                        | Notes                                                               |
| ---------- | ------------------------------ | ------------------------------------------------------------------- |
| 2026-09-12 | _(fill in from the dashboard)_ | Previous token expired ~2026-09-08 and broke the 2026-09-12 deploy. |

### Migrations

`supabase/migrations/` is the source of truth for schema — the only files you hand-write and the only ones applied to any database. `supabase start` replays them into the local stack from scratch; `supabase migration up --local` applies just the pending ones to a running stack.

Adding a table, start to finish:

```bash
supabase migration new add_foo   # real timestamp — several older filenames were hand-invented
# write create table + enable RLS + policies + grants into the new file
supabase migration up --local    # applies only pending migrations; NOT db reset
pnpm db:schema                # supabase/schema/foo.sql appears on its own
pnpm migrate                  # cloud — developer runs this, never an agent
```

Steps 1-3 are Supabase's own documented imperative flow. `--local` is already the
default; it is spelled out because the same command takes `--linked`. The repo
substitutes `pnpm migrate` for `supabase db push`, and adds `pnpm db:schema`,
which is not a Supabase step.

**Schema changes go in the migration, never in `supabase/schema/`.** Those files are
outputs — `scripts/db-schema.sh` deletes the directory and re-dumps it from the live
local DB on every run, so a hand-edit there is gone at the next `pnpm db:schema`
and never reaches any database. Wanting to edit one is the signal that a new
migration is what you actually want.

**`supabase/schema/` is a generated snapshot, never applied.** 24 chronological migrations don't tell you what the schema _is_ right now; those files do — one per table or view (`questions.sql`, `progress.sql`, …), each carrying that relation's columns, constraints, indexes, RLS policies, and grants together. Regenerate with `pnpm db:schema` (`scripts/db-schema.sh`, per-relation `pg_dump` against the local container) after applying a migration locally, and commit the result. The script wipes the directory first, so a dropped table's file disappears on its own. Nothing reads it at runtime and `scripts/migrate.js` only ever globs `supabase/migrations/`.

**It is a picture of _local_, which is not identical to cloud.** `supabase/seed.sql` runs on `supabase start` and is never pushed, so anything it creates shows up in the snapshot while being absent from the hosted project. Before treating a policy or table in `supabase/schema/` as production reality, check it came from `supabase/migrations/` and not from the seed.

**Declarative schemas (`supabase/schemas/` + `supabase db diff`) were considered and rejected.** Supabase's own caveat list for the diff engine excludes `alter policy` statements, `security_invoker` on views, and DML — which is most of what this repo's migrations contain (18 owner-scoping policies, the `question_counts` view, the static topic-group seed). Deploys also go through `scripts/migrate.js`, not `supabase db push`. The snapshot above buys the same per-table readability without adopting the workflow.

## CI/CD

- `.github/workflows/ci.yml` — `lint` and `test` as separate jobs on every push to `main`.
- `.github/workflows/deploy.yml` — **manual only** (`workflow_dispatch`); never fires on push. Runs `scripts/migrate.js` before building and deploying to Vercel production, so a new build never meets a schema it doesn't expect. Needs `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` repo secrets alongside the Vercel ones. If this step fails with `401 Unauthorized`, the token has expired — see "Environment" above.
- `vercel.json` sets `git.deploymentEnabled: false` — pushing to GitHub builds nothing. Production ships only via the manual workflow. `package.json`'s `engines.node` pins Node 24.

---

## Repo layout

**Routes** — everything under `(app)/` sits behind the login gate.

```
app/
├── (app)/
│   ├── layout.tsx        seeds the store with groups + totals
│   ├── page.tsx          dashboard
│   ├── [topic]/
│   │   ├── (overview)/   topic overview (route group scopes its loading.tsx)
│   │   └── [file]/       section view
│   ├── inbox/
│   ├── starred/
│   ├── grey-zone/
│   ├── priority-mix/
│   └── settings/
├── login/
├── signup/
└── auth/callback/        OAuth return, calls exchangeCode
```

**Features** — one folder each. Entry component at the root, supporting
pieces in nested `components/ db/ actions/ hooks/ store/`, public surface
exported from `index.ts`. Import from `@/features/<name>`, never a deep path.

```
features/
├── authoring/            add/edit question modals, AI wiring, own store
├── section-view/         the question list — filters, drag reorder, bulk ops
├── dashboard/            topic cards + overall progress
├── sidebar/              topic tree
├── inbox/                capture pasted text before filing it
├── settings/             theme, AI model, instruction presets
└── login/  signup/       auth forms + their server actions
```

**Shared code**

```
lib/
├── actions/              server actions — data mutations
├── ai/                   everything Gemini-facing: models, prompts, client, actions
├── content/              curriculum layer: topics, topicsData, parser
├── context/              React contexts — theme, drawer, search, font size
├── db/                   shared query helpers
├── hooks/                cross-feature hooks
├── stores/               Zustand store, slices, selectors
├── supabase/             client, server, middleware, user helpers
└── *.ts                  standalone modules with no sibling:
                          instructionPresets, htmlToMarkdown, types
                          (PriorityLevel), utils (shadcn's cn)

components/               feature-independent UI
├── ui/                   shadcn primitives
├── QuestionItem/         one question — answer body, code, star, kebab
├── QuestionShortlist/    shared list UI for starred + grey-zone
└── Topbar/
```

**Everything else** — `supabase/migrations/` (timestamped SQL) and `supabase/schema/`
(generated snapshot, one file per relation), `scripts/`
(migrate, set-admin, pull-remote, db-schema, two one-time fixups), `public/` (`manifest.json`), `design/` (standalone HTML prototypes, not built or imported).

**In `design/`, `app.jsx` is the source of truth for what a page looks like** — the
built prototype of the whole app, decisions already made. The `*.html` files are
option explorations (`Starred Grouping Options.html`, `Topic View Options v3.html`,
…), often several variants of one decision that may never have been taken. Read
`app.jsx` first when asked to match "the design"; treat an options file as the answer
only when `app.jsx` doesn't cover that screen.

See `components/AGENTS.md` for component conventions — feature-first organization, when to split a file, and the rule keeping root-level `components/` independent of any feature.

---

## Architecture

### Owner-scoped content

- **Every account sees only what it created.** `20260802120000_owner_scoped_content_reads.sql` replaced the open SELECT policies on `questions`/`topic_groups`/`sections` with `created_by = auth.uid()`.
- **No shared curriculum, no admin read bypass.** Admins are isolated exactly like everyone else.
- **Rows with `created_by IS NULL` have no owner**, so no account can read them.
- **Filtering happens in RLS, not app code.** `lib/supabase/server.ts`'s `createClient()` is cookie-scoped (anon key, caller's session), so queries carry no `.eq('created_by', ...)` — the DB enforces it for the browser client and server actions alike.
- **Never reach for the service-role client on a read path.** That's the one thing that actually breaks the model; it bypasses RLS entirely. An extra app-level filter is merely redundant — the real boundary stays the policy.

### Auth & admin roles

- **Anonymous auth is gone.** Nothing calls `signInAnonymously` any more.
- **Every route is gated.** `lib/supabase/middleware.ts` checks `!!user && !user.is_anonymous` and redirects to `/login`. Only `/login`, `/signup`, `/auth/*`, and `/manifest.json` are exempt.
- **Sign-in is email/password, Google, or GitHub** — all in `features/login/actions/auth.ts`, surfaced by `app/login/page.tsx` and `app/signup/page.tsx`. OAuth returns through `/auth/callback`, which calls `exchangeCode`.
- **`authSlice` holds only** `signInWithGitHub`/`signOut` and the `onAuthStateChange` subscription.
- **Three helpers in `lib/supabase/user.ts`** — `getUser()`, `requireUser()`, `requireAuthor(message)`. Authoring and AI actions call `requireAuthor()`, which throws unless the caller is signed in and non-anonymous. Middleware already enforces that on every route, so it's defence-in-depth.
- **Admin status lives in `app_metadata.is_admin`** — never `user_metadata`, since only the service role can write `app_metadata`, which is what makes it safe to trust inside RLS. Granted via `pnpm set-admin <email>`.
- **Admin RLS policies cover writes only.** `20260711194952_admin_question_access.sql` and `20260716120000_topic_delete.sql` add permissive `_admin` policies (Postgres ORs permissive policies together) letting admins edit or delete any question or topic, including ownerless rows. Client-side, `user.app_metadata?.is_admin === true` gates the same actions alongside `createdBy === user.id` checks.
- **SELECT has no admin bypass** — an admin cannot read another account's rows.

### Content loading & routing

`lib/content/` is the curriculum layer:

- **`topics.ts`** — `TopicGroup`/`SectionMeta` types plus pure helpers (`findGroup`, `sectionPath`, `sectionUrl`, `slugify`, …) that take a `groups` array as an explicit parameter. No data of its own: the static `TOPIC_GROUPS` seed was deleted once the DB became the only source of the curriculum, so there is nothing here to keep in sync with anything.
- **`topicsData.ts`** (`server-only`) — `getAllGroups()`, request-memoized via React `cache()`, returns **only the caller's own** `topic_groups` + `sections` rows. Empty for a brand-new account. Every reader of the curriculum goes through it.
- **`parser.ts`** (`server-only`) — `countQuestions`/`parseSection`/`fetchAllCounts` against `questions`. Answer HTML is rendered at write time (`marked` + `isomorphic-dompurify`), not query time.
- **No barrel on this folder** — most of `topics.ts`'s consumers are client components, and an `index.ts` re-exporting all three would drag the two `server-only` siblings into client bundles.

Routing:

- **Two dynamic routes, not one catch-all.** `app/(app)/[topic]/(overview)/page.tsx` renders the topic overview (auto-redirecting single-section groups); `app/(app)/[topic]/[file]/page.tsx` renders the section view.
- **The `(overview)` route group exists for `loading.tsx`.** A `loading.tsx` at `[topic]/` wraps that segment *and its children*, so it would show the topic skeleton on the way to a question page too. The group is a tree node that contributes no URL segment, which scopes the boundary to the overview page alone. Don't flatten it away.
- **Five sibling routes** under `(app)/`: `inbox` and `settings` do no server fetch (their data is client-side in the store); `starred`, `grey-zone`, and `priority-mix` fetch the user's rows server-side before handing assembled data to a client component.
- **Nothing is prerendered, and neither page exports `generateStaticParams()`** — exporting it *at all*, even returning `[]`, opts the route into static generation, and unlisted paths are then generated on demand statically, so `cookies()` throws `DYNAMIC_SERVER_USAGE`. Both page files carry a comment saying so. `getAllGroups()` reads `cookies()`, which forces dynamic rendering — no shared cache entry can serve one account's topics to another — and makes build-time evaluation impossible.
- **Don't add `export const revalidate` to these routes.** Mutating server actions still `revalidatePath` the section and its topic overview.

### State management: one store per request tree

Eight slices compose one Zustand store (`lib/stores/appStore.ts`), five in `lib/stores/slices/` and three owned by their feature. Shared types in `lib/stores/types.ts`.

| In `lib/stores/slices/`                                                                                | In `features/`                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `authSlice`, `progressSlice`, `setAsideSlice`, `flagCountsSlice`, `questionOrderSlice` | `settings/store/settingsSlice`, `inbox/store/inboxSlice`, `section-view/store/sectionQuestionsSlice` |

- **The store is NOT a module singleton.** `appStore.ts` exports `createAppStore(init)` (`createStore` from `zustand/vanilla`) plus a `StoreContext`; `StoreProvider.tsx` builds one per tree via a `useState` lazy initializer. A module-level `create()` in a Next server process is shared across every request — with owner-scoped content that's a cross-account leak waiting for the first render-phase write.
- **Server data is seeded at construction, not by an effect.** `app/(app)/layout.tsx` passes `getAllGroups()` + `fetchAllCounts()` into `<StoreProvider groups totals>`, so `groups`/`totals`/`stats` are right on the first render.
  - `totals` is seeded once and never re-synced — `setSectionTotal()` refines it as sections mount, and re-seeding would wipe those refinements.
  - `groups` _is_ re-synced by a `StoreProvider` effect; it's a fresh server value on every `router.refresh()`, which is how a new topic reaches the tree.
  - `initAuth`/`initSettingsFromLocalStorage` stay in effects — they read `localStorage` and register subscriptions, effects on their own merits.
- **Consuming it** — `useAppStore(selector)` (`useShallow` works), or `useAppStoreApi()` for imperative `getState`/`subscribe` outside render. There is no importable store instance; slices reach their own state via `get()`.
- **Plain Context still owns client-only UI state** — `UIContext` (drawer/search), `ThemeContext`, `FontSizeContext`. Self-contained, no server dependency.
- **`features/authoring/store/` is a separate store** for the authoring modals, not part of `useAppStore`.

### Dynamic topics & authoring

- **Users add topics and subtopics at runtime**; they land in `topic_groups`/`sections` (migrations `20260715120000_topic_groups.sql`, `20260716120000_topic_delete.sql`).
- **`lib/actions/topics.ts`** holds `addTopicGroup`/`addSection`/`deleteSection`/`deleteTopicGroup`. Deletes refuse while questions are still filed under the topic or subtopic.
- **Every topic gets a reserved `code_output` subtopic** (`CODE_OUTPUT_FILE` in `topics.ts`), guarded by `codeOutputSlug.test.ts` so no ordinary subtopic can slugify onto it.
- **`questions.code`/`questions.output`** (migration `20260901120000_code_output_questions.sql`) — a row with `code` set renders as a code question rather than a plain answer or a problem/solution rail.
- **`components/AddQuestionFab.tsx`** (draggable via `lib/hooks/useFabDrag.ts`) opens `AddTopicModal` or one of the `features/authoring/` modals. Those keep an in-memory-only `AnswerVersion[]` history of generated drafts — a UI convenience, not a DB-level version table.

### AI-assisted authoring

Everything Gemini-facing lives in `lib/ai/`, leaving `lib/actions/` as plain data mutations.

- **`models.ts`** — the shared model list (`gemini-3.1-flash-lite` default) plus `AUTO_RUN_MODEL`.
- **`prompts.ts`** — every system instruction, holding only the model's role and the output contract the app parses against. Style guidance is the author's, from `lib/instructionPresets.ts`.
- **`gemini.ts`** — the only place that calls Google's REST API (no SDK), owning `FREE_GEM_API_KEY`, model validation, and error handling. `gemini()` for plain text, `geminiJson()` when the prompt asks for JSON (adds `responseMimeType`, strips code fences before parsing).
  - It deliberately does **not** do auth — the failure message is per-action, and `checkDuplicate` needs the `supabase` client that `requireAuthor` returns.
- **Eight `'use server'` actions** — `generateQuestion`, `generateAnswer`, `generateBlurb`, `generateProblem`, `generateCodeOutput`, `suggestPlacement`, `checkDuplicate`, `formatAnswer`. Each re-derives auth itself via `requireAuthor`.
- **`suggestPlacement` and `checkDuplicate` re-validate the model's JSON** against the real curriculum and question list server-side — the model can return well-formed JSON naming ids that don't exist.
- **`features/inbox/actions/splitInboxText.ts` is a ninth caller**, kept with its feature.
- **No barrel on `lib/ai/`** — the authoring store's tests mock each action individually, and a barrel would collapse those into one whole-module mock.

### Question ids & moves

- **Ids are namespaced by section** — `"{topic}/{file}/u-{uuid}"`. Progress and question order key off that id.
- **A section change mints a new id.** `updateQuestion` (and `moveQuestion` via `MoveQuestionModal.tsx`) never repoints `topic`/`file` on the existing row — otherwise the question counts toward its old subtopic forever.
- **`carryOverProgress()`** in `lib/actions/questions.ts` migrates the acting user's own rows to the new id, insert-before-delete for row-presence tables like `progress`. The store mirrors it via `renameProgressId`/`renameOrderId` so the UI doesn't wait on a reload.
- **`questions.markdown`** (migration `20260711190453_question_edit_delete.sql`) keeps raw source so edits reload real Markdown, plus owner-scoped update/delete RLS — ownerless rows are uneditable except by admins.
- **`lang`/`tags`/`problem`** (migration `20260715180000_question_impl_fields.sql`) — a non-empty `problem` is what switches `QuestionItem` to a Problem → Solution layout, with no separate boolean.

### Study-flow features

**Question flags are columns on `questions`, not join tables.** `20260804105557_merge_starred_priority_into_questions.sql` folded `starred_questions` and `priority` into `questions.starred`/`questions.priority` and dropped both tables; `20260827120000_grey_zone.sql` added `questions.grey_zone` the same way. Content is owner-scoped, so a per-user join row was always redundant with `created_by`. All three are written through `lib/actions/questionFlags.ts` and read through `lib/db/shortlist.ts`.

| Feature      | Where                                           | Storage                             |
| ------------ | ----------------------------------------------- | ----------------------------------- |
| Inbox        | `features/inbox/`                               | `inbox_items`                       |
| Set aside    | `lib/actions/setAside.ts`, `lib/db/setAside.ts` | `set_aside_items`                   |
| Starred      | `components/ShortlistPage.tsx`                  | `questions.starred`                 |
| Grey Zone    | `components/ShortlistPage.tsx`                  | `questions.grey_zone`               |
| Priority Mix | `components/PriorityMixClient.tsx`              | `questions.priority` (high/med/low) |
| Manual order | `lib/actions/questionPosition.ts`               | `question_position`                 |

- **Inbox** — zero-friction capture of pasted text before picking a topic. `splitInboxText.ts` uses Gemini to split freeform text (e.g. a recruiter message) into distinct questions. Assigning an item reopens the add-question modal prefilled; saving deletes the source item.
- **Set aside** — the kebab menu's soft delete. `setAsideQuestion()` inserts a full content snapshot into `set_aside_items` _before_ deleting from `questions`, so a mid-failure can never lose content, then best-effort cleans the user's progress rows. Reassigning restores the full saved answer, unlike inbox items which carry only a title.
- **Starred / Grey Zone** — hand-curated shortlists sharing the `ShortlistFlag` type and the `components/QuestionShortlist/` UI. Both routes are the same page: `components/ShortlistPage.tsx` takes the flag plus its copy and renders topic cards, drilling into one topic via `?topic=<slug>` so the page stays a server component. Optimistic local update.
- **Priority** — `user_settings.default_priority` (migration `20260718130000_default_priority.sql`) sets what's pre-selected on new questions.
- **Manual reordering** — drag logic in `features/section-view/hooks/useSectionDrag.ts`: native Pointer Events, no drag library, a floating clone tracking the pointer, drop slot from the pointer's Y against each row's midpoint. Only in `'manual'` sort mode with no active filters.
  - **Touch pointers bail out** (`if (e.pointerType !== 'mouse') return`) so dragging doesn't fight scroll gestures — reordering is mouse-only.
- **Every mutation is online-only.** There is no pending-ops queue or local write buffer; a failed write rolls the store back.

### Instruction presets

- **`lib/instructionPresets.ts`** — user-editable style instructions fed into the AI actions, auto-selected by `kind` (`text` vs `code`) rather than one global active choice.
- **Four protected built-ins** (`default-text`/`default-code`/`default-suggestion`/`default-problem`) always exist and can't be deleted; `migratePresets()` backfills any missing from older data.
- **Stored in `user_settings.instruction_presets`** (jsonb) + `active_instruction_preset_id` (migration `20260716220000_instruction_presets.sql`) so presets sync across devices.
- **`settingsSlice.loadSettings` still falls back to localStorage** for accounts with no `user_settings` row yet. Managed from `/settings`.

### PWA

- **The app is installable, not offline-capable.** `public/manifest.json` + `metadata.manifest` in `app/layout.tsx` are all that remain; there is no service worker.
- **Offline support was removed on 2026-09-12.** `public/sw.js`, `lib/offlineSync.ts`, `offlineSlice`, `OfflineStatusPill`, `OfflineToast`, `ServiceWorkerRegistration`, the settings "Offline access" section, and the `@serwist/next`/`serwist` deps are all gone. **Do not re-add a service worker or a localStorage write queue** without a deliberate decision — the pending-ops paths in `progressSlice` were the main source of divergence between local and server state.
- **Browsers that installed the old worker keep it.** A 404 on `/sw.js` does not unregister a registration ([w3c/ServiceWorker#204](https://github.com/w3c/ServiceWorker/issues/204), closed `wontfix`), so anyone who loaded production before the removal keeps serving from the stale `interview-pages-v2` cache until they clear site data. Accepted knowingly; no unregister shim was shipped.

---

## Conventions

- **React imports** — automatic JSX runtime (`"jsx": "react-jsx"`). Do **not** `import React from 'react'` unless you use the `React` namespace directly. Import hooks directly: `import { useState } from 'react'`.
- **Exports** — always named (`export const MyComponent = ...`), never default, except where a framework demands it: Next route files, `next/dynamic` targets, and config files.
- **Hooks** — a hook used by one feature lives in that feature's `hooks/`; one shared across features lives in `lib/hooks/` (barrel: `@/lib/hooks`). Nothing hook-shaped stays loose at `lib/` root.
- **State locality** — keep state as local as possible and lift only when necessary. Don't pass store data down as props when the child can read it from `useAppStore` directly.
- **Naming** — a name says what the thing is for without being a sentence. Aim for the shortest name that answers "what is this?" alone: `canCheckDuplicate`, `resolveTargetSection`. Avoid names needing the surrounding line (`data`, `handle`, `tmp`, `p2`) and padding that adds nothing (`theCurrentlySelectedTopicGroupSlug`). Drop words the context supplies — inside `usePlacement`, `pending` beats `pendingPlacement`. Booleans read as assertions (`isImpl`, `canSave`), functions as verbs (`suggest`, `reset`).
- **Arrow bodies** — if the body doesn't fit on the `=>` line, give it a block body with an explicit `return`; never leave a concise body dangling on the next line. Parenthesised bodies (`=> (` for JSX, `=> ({` for object literals) are exempt. New code only; don't retrofit.

  ```ts
  // no — body wrapped to the next line                // yes
  const labelOf = (options, v) =>                      const labelOf = (options, v) => {
    options.find((o) => o.value === v)?.label ?? '';     return options.find((o) => o.value === v)?.label ?? '';
                                                       };
  // fine as-is — parenthesised body
  {items.map((i) => (<Row key={i.id} {...i} />))}
  const toOption = (g) => ({ value: g.slug, label: g.groupName });
  ```

- **Named intermediates** — an object literal, JSX prop, or argument reads as a list of fields; a reader scanning it should get each one at a glance. Any value needing a ternary, a chained `.some()/.find()`, or a multi-line expression gets a named `const` above the `return` instead, and the literal names it. The name is the point: it says what the value *means*, which the expression only implies. New code only; don't retrofit.

  ```ts
  // no — the reader parses a predicate to learn one field
  return {
    activeInstructionPresetId: migrated.some((p) => p.id === row.active_id)
      ? row.active_id
      : migrated[0].id,
  };

  // yes — the field list stays scannable, the why moves to a name
  const savedIdExists = migrated.some((p) => p.id === row.active_id);
  const activeInstructionPresetId = savedIdExists ? row.active_id : migrated[0].id;
  return { activeInstructionPresetId };
  ```

### Odds and ends

- **Syntax highlighting** — `components/QuestionItem/highlight.ts` wraps Prism.js, highlighting the `<pre><code class="language-xxx">` DOM `marked` already produced, so no re-render is needed. Lazy-loaded at its call sites.
- **HTML→Markdown fallback** — `lib/htmlToMarkdown.ts` (via `turndown`) best-effort reconstructs Markdown for editing questions that predate the `markdown` column. Explicitly lossy.
- **FAB drag** — `lib/hooks/useFabDrag.ts` uses its own small Zustand store (`useFabOffsetStore`, separate from `useAppStore` — pure client UI state, and the FABs render outside `UIProvider`) so dragging any one FAB moves the whole bottom-right cluster. Resets on route change.
- **`components/MainContent.tsx`** — swaps in `<SearchResults>` once the shared search query hits 2 chars, and manually resets scroll on pathname change: the app is one catch-all route, so Next's built-in scroll reset never fires.
