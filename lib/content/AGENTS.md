# AGENTS.md — lib/content/

The curriculum layer. The database is the only source of topics — **never add a static curriculum constant.**

- **`topics.ts`** — `TopicGroup`/`SectionMeta` types and pure helpers (`findGroup`, `sectionPath`, `sectionUrl`, `slugify`, …) taking `groups` as a parameter. No data of its own.
- **`topicsData.ts`** (`server-only`) — `getAllGroups()`, memoized per request with `cache()`, returns only the caller's own rows (RLS does the filtering). Every curriculum reader goes through it.
- **`parser.ts`** (`server-only`) — question counts and section parsing. Answer HTML is rendered at write time (`marked` + `isomorphic-dompurify`), not query time.
- **No barrel file.** Most `topics.ts` consumers are client components; a barrel would drag the `server-only` siblings into client bundles.
- **Reserved `code_output` subtopic** (`CODE_OUTPUT_FILE`) exists in every topic; `codeOutputSlug.test.ts` keeps ordinary subtopics from slugifying onto it.

## Routing that depends on this

- `app/(app)/[topic]/(overview)/page.tsx` — topic overview; `app/(app)/[topic]/[file]/page.tsx` — section view.
- **Keep the `(overview)` route group.** It scopes `loading.tsx` to the overview; at `[topic]/` it would also wrap the section page.
- **No `generateStaticParams()` and no `export const revalidate`** on either. `getAllGroups()` reads `cookies()`, so these routes must render dynamically; exporting `generateStaticParams` at all (even `[]`) makes `cookies()` throw `DYNAMIC_SERVER_USAGE`. Mutating actions `revalidatePath` the section and its overview.
