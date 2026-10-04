# AGENTS.md — components/

Scoped conventions for everything under `components/`. See the root `AGENTS.md` for repo-wide rules and the index of other scoped guides.

## UI primitives

`components/ui/` contains shadcn/ui-style components (Accordion, Badge, Card, Progress, Button). Tailwind + `@tailwindcss/typography` for styling.

## Component conventions

**New code is organized feature-first, not file-type-first.** When building a new feature (a modal, a study-flow feature, a new authoring surface), start with a folder named for the feature under `features/` (or `lib/actions/` for general cross-cutting actions) and put that feature's pieces inside it. Enforce the standard layout pattern:

- **Base component at root:** The entry point client component for the feature (e.g. `DashboardClient.tsx`, `InboxClient.tsx`) should live at the root of the feature folder (`features/<name>/`).
- **Sub-components under `components/`:** Colocate supporting or sub-components (such as list items, specialized cards, or input forms) in a nested `features/<name>/components/` folder.
- **Database logic under `db/`:** All database files (e.g. queries, fetchers, mutations) must live in a nested `features/<name>/db/` directory.
- **Root Barrel Export (`index.ts`):** Every feature folder MUST have a root `index.ts` file that acts as a barrel export, re-exporting only the feature's public components, actions, and query layers. External consumers MUST import from the feature root path (`@/features/<name>`) rather than deep file paths. Files within the feature importing their own siblings or nested files should use direct relative imports (e.g., `./components/TopicCard` or `../db/db`) to avoid circular imports.
- **Arrow Functions & Store/Hook State Access:** Always try to use arrow functions when creating components. Avoid passing everything as props; if a piece of state, a selector, or a method is accessible through a global store (e.g., Zustand's `useAppStore`) or a hook, consume it directly inside the component instead of passing it down from a parent.

Within the feature folder, still split into standalone components/hooks per the rules below rather than one large file — the folder is the feature boundary, the files inside it are the actual units of reuse/testability. This is proactive (decide the shape up front for anything non-trivial), unlike the "when a component grows" trigger below, which is reactive cleanup for code that wasn't planned this way. See `features/authoring/` as the reference shape: public entry points at the root (`AddQuestionModal.tsx`/`EditQuestionModal.tsx`, both thin wrappers over the shared `components/QuestionFormModal.tsx`), sub-components in `components/`, state and logic in `hooks/` (which holds `use*` files and nothing else), pure non-React helpers plus their tests in `utils/` (`placementOptions.ts` + `placementOptions.test.ts`, `markdownPreview.ts`), and only `types.ts`/`index.ts` left at the root.

`eslint.config.mjs` warns (doesn't fail CI) when a file under `components/**` or `lib/actions/**` exceeds 200 lines (`max-lines`) — a tripwire to catch drift, not the actual rule. Line count alone never decides whether to split a component; splitting only to hit a number produces meaningless bins (`Header.tsx`/`Body.tsx`/`Footer.tsx`) that just relocate the same coupling. Split when one of these is actually true:

- **Mixed concerns** — data-fetching/business logic tangled with rendering. Extract the logic into a custom hook — `features/<name>/hooks/` if only that feature uses it, `lib/hooks/` if it's shared across features (following `useFabDrag`/`useTypewriter`/`useProgressStats`) — leave the component rendering only.
- **A genuinely separable, reusable, or independently-testable subtree** — e.g. a modal's markdown editor or AI-actions toolbar deserves its own file; a component's header/body/footer usually doesn't.
- **Repeated markup or logic** (3+ similar blocks) — extract a shared component or map over data instead.
- **A conditionally-rendered heavy subtree** (modal body, rarely-used panel) — extract it **and** lazy-load it (`next/dynamic` or `import()`, per the FAB modals and `components/QuestionItem/highlight.ts`) so it's a bundle-size win, not just a readability one.

When a component does grow siblings, colocate them in a folder (`SomeModal/index.tsx`, `MarkdownEditor.tsx`, `AiToolbar.tsx`) instead of scattering flat files across `components/`.

**Root-level `components/` must stay feature-independent.** Anything living directly under `components/` (not inside a feature folder) may not import from a specific feature's `actions`/`lib` — that's a feature reaching into another feature through a shared component, defeating the point of feature-first segregation. Instead the root component takes the feature-specific behavior (a server action, a callback, config) as a **prop**, and each feature passes its own in at the call site. Promote a component out of a feature folder to `components/` root only once a second feature needs the exact same UI/logic — don't pre-extract for a single caller. See `components/GoogleAuthButton.tsx` (takes an `action` prop typed to the state shape it needs, no import of any feature's actions) alongside `features/login/components/LoginForm.tsx` and `features/signup/components/SignupForm.tsx`, each passing in its own action (`loginWithGoogle` / `signUpWithGoogle`) — the second one re-exported from `features/signup/actions` rather than the component reaching across features itself.

## Notes on specific components

- **`QuestionItem/highlight.ts`** — Prism over the `<pre><code class="language-…">` DOM `marked` already produced, so no re-render. Lazy-loaded at call sites.
- **FAB cluster** — `lib/hooks/useFabDrag.ts` has its own tiny Zustand store (the FABs render outside `DrawerProvider`/`SearchProvider`), so dragging one FAB moves the whole cluster. Resets on route change.
- **`MainContent.tsx`** — swaps in `<SearchResults>` once the search query hits 2 chars, and resets scroll manually on pathname change because Next's built-in reset doesn't fire here.
- **`ShortlistPage.tsx`** — one page for both `/starred` and `/grey-zone` (takes the flag + copy); drills into a topic via `?topic=<slug>` so it stays a server component.
