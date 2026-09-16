# DSA Question Type — Implementation Plan

Drafted 2026-09-14 from `design/DSA Question Type Options.html`, `design/app.jsx`,
`design/data.js`, `design/add-question.jsx`, and `design/add-topic.jsx`.

The options file explores five layouts. **Option E** is labelled "spec'd version"
and is the one `design/app.jsx` actually implements as `DsaQuestionBody`, so E is
the target — the `*.html` options file is only the record of how it was chosen.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped

---

## What a DSA question is

Header carries **title + difficulty pill + pattern tags**. The body is four
**independently collapsible** sections — Description, Solution, Output,
Explanation — with Description/Solution/Output open by default and Explanation
closed. **Prerequisite chips sit under Description, outside every collapser**, so
they stay visible whatever else is collapsed.

DSA-ness is a property of the **subtopic** (`isDsa`), exactly parallel to today's
`isCode`, plus a **topic-level** flag that makes every subtopic added under it DSA
automatically. Unlike `code_output`, a DSA subtopic gets an ordinary slug and a
topic may have many of them (`Arrays & Strings`, `Linked Lists`, …) — there is no
reserved slug and no one-per-topic cap.

---

## Field mapping

Most of the design is already storable. Only four columns are new.

| Design field             | Storage                                 | New?             |
| ------------------------ | --------------------------------------- | ---------------- |
| title                    | `questions.title`                       | —                |
| difficulty Easy/Med/Hard | `questions.priority` low/med/high       | — (relabel only) |
| patterns[]               | `questions.tags` (CSV, like Tags today) | —                |
| description (markdown)   | `questions.problem`                     | —                |
| description (html)       | `questions.problem_html`                | **new column**   |
| prerequisites[]          | `questions.prerequisites` (CSV)         | **new column**   |
| lang / code / output     | `questions.lang` / `code` / `output`    | —                |
| explanation md / html    | `questions.markdown` / `body_html`      | —                |
| subtopic is DSA          | `sections.is_dsa`                       | **new column**   |
| topic is DSA             | `topic_groups.is_dsa`                   | **new column**   |

### Discriminator: `q.code && q.problem`

No `kind` column. Those two fields are mutually exclusive by construction today —
`CodeQuestionModal` writes `code` and never `problem`; `QuestionFormModal` writes
`problem` and never `code` — so the pair is a free, currently-unused signal.

It has to live on the **question**, not the section: `QuestionAnswerBody` is also
rendered by Priority Mix (`components/PriorityMixClient.tsx`) and the shortlists
(`components/QuestionShortlist/ShortlistRow.tsx`), where no section context is in
hand. Deriving the layout from `sections.is_dsa` would mean plumbing the flag
through three more query paths for no gain.

---

## Phase 1 — Migration

- [x] **1.1** `supabase/migrations/20260914093316_dsa_questions.sql` — four columns, no backfill:
  - `alter table questions add column problem_html text`
  - `alter table questions add column prerequisites text`
  - `alter table sections add column is_dsa boolean not null default false`
  - `alter table topic_groups add column is_dsa boolean not null default false`
- [x] **1.2** `supabase migration up --local`, then `npm run db:schema`, commit the
      regenerated `supabase/schema/`.
- [ ] **1.3** Cloud: **developer runs `npm run migrate`**, never an agent.

No new RLS policies — all four columns ride on their tables' existing policies.

---

## Phase 2 — Types and the DSA flag

- [x] **2.1** `lib/content/topics.ts` — `isDsa?: boolean` on `SectionMeta` and
      `TopicGroup`. **No `isDsaSection()` helper** — `isCodeOutputSection` earns its
      keep by encoding the reserved-slug convention (`file === CODE_OUTPUT_FILE`);
      wrapping a plain boolean field adds nothing, so callers read `section.isDsa`.
- [x] **2.2** `lib/content/topicsData.ts` — `is_dsa` added to both selects and
      mapped onto the group and section objects.
- [x] **2.3** `lib/actions/topics.ts` — `addSection` and `addTopicGroup` accept and
      persist `isDsa`. A DSA subtopic slugifies normally (contrast `CODE_OUTPUT_FILE`).
      Two rules live in `addSection` rather than in the modal, since the action
      already has the parent group in hand: a DSA topic implies DSA subtopics
      (`input.isDsa || group.isDsa`), and `isCode` wins over both — a subtopic is
      never code-output *and* DSA, or the FAB can't pick one modal.

---

## Phase 3 — Read path

- [x] **3.1** `lib/content/parser.ts` — `problem_html`, `prerequisites` added to the
      `parseSection` select and to `ParsedQuestion`.
- [x] **3.2** `components/QuestionItem/DsaAnswer.tsx` — near-copy of `CodeAnswer`:
      adds a Description collapser and the prereq chips, Description/Output open by
      default, Explanation closed. Reuses `q-code-card`, `qc-toggle`, `qc-output`,
      `qc-explain` and the lazy `./highlight` import unchanged.
      **Three collapsers, not four** — `design/app.jsx`'s `DsaQuestionBody` leaves
      the solution card always visible (so does `CodeAnswer`); only the options
      file wraps it in a "Solution" disclosure, and app.jsx wins per `CLAUDE.md`.
      Prerequisites render *outside* the Description disclosure, which app.jsx's own
      comment specifies but its code omits.
- [x] **3.3** `components/QuestionItem/QuestionAnswerBody.tsx` — 4-way dispatch:
      DSA (`code && problem`) → code → problem → plain. DSA must be checked first.
- [x] **3.4** Header extras go through existing `QuestionItem` slots, so
      `QuestionItem.tsx` itself is untouched: difficulty pill as the first child of
      `actions`, pattern tags as `subtitle`, both in `DsaMeta.tsx`. Wired into
      `QuestionList` only — in Priority Mix and the shortlists the crumb owns
      `subtitle`, so those rows show neither. Revisit if it grates.
- [x] **3.5** Prereq chips call `useSearch().setQuery(term)` (`lib/context/SearchContext.tsx`),
      which is what the design's `href="#"` chevron affordance wants. **Content-
      dependent:** search covers title + `body_html` only, so a prerequisite naming a
      concept no question mentions dead-ends at 0 results. Indexing `tags`/
      `prerequisites` is the upgrade if that turns out to bite.
- [x] **3.6** `lib/db/priority.ts` and `lib/db/shortlistServer.ts` — extend their
      selects, plus `lib/db/shortlist.ts`'s shared type. **Fixed a pre-existing bug
      in passing:** neither selected `code`/`output`, so code-output questions were
      already rendering as `PlainAnswer` in Priority Mix and the shortlists.
- [x] **3.7** `app/globals.css` — `.diff` pills (they already resolve against the
      existing `--pri-*-soft` tokens as `.diff.low/.med/.high`), `.q-pattern-row`/
      `.q-pattern-tag`, `.prereq-*`, `.q-dsa-desc`. No new tokens, so dark mode came
      for free.

---

## Phase 4 — Authoring

- [x] **4.1** `features/authoring/DsaQuestionModal.tsx`, modelled on
      `CodeQuestionModal` — same reasons for staying off the authoring store (fixed
      placement, no answer-draft history, no duplicate check). Adds Description and
      Prerequisites fields; relabels the priority pills Hard/Medium/Easy.
      Patterns and Prerequisites are comma-separated text inputs, matching the
      existing Tags field — no chip editor (see cuts).
- [x] **4.2** `lib/actions/questions.ts` — `AddQuestionInput` gains `prerequisites`;
      `problem_html` is rendered at write time via the existing `renderAnswerHtml`,
      keeping the repo's render-at-write rule. `validateQuestion` gained a DSA arm.
      **Also fixed a latent data-loss bug:** `updateQuestion` now reads the row's
      existing `code`/`output`/`prerequisites` and treats an *absent* input field as
      "keep" rather than "clear". The plain question form owns none of those, so
      editing a code-output question from Starred / Grey Zone / Priority Mix — all of
      which routed every row to that one form — was nulling the snippet on save.
- [x] **4.3** `components/AddQuestionFab.tsx` — DSA arm alongside the code-output one,
      plus an "Add DSA question" label on the button itself.
- [x] **4.4** `EditingDsaQuestion` in `features/authoring/types.ts`, and `onEdit`
      routes DSA rows to the new modal in **all three** views that offer editing:
      `QuestionList`, `components/QuestionShortlist/index.tsx`, and
      `components/PriorityMixClient.tsx`. Code-output rows still open the plain form
      in the latter two — no longer destructive after 4.2, but still the wrong
      editor. Worth a follow-up.
- [x] **4.5** `features/authoring/utils/placementOptions.ts` and
      `components/MoveQuestionModal.tsx` — **exclude DSA sections** the same way they
      exclude code-output ones. A plain question filed into a DSA subtopic renders
      with no description and no code. Covered by a new case in
      `placementOptions.test.ts`.

---

## Phase 5 — Chrome and AI

- [x] **5.1** `components/AddTopicModal.tsx` — both toggles from `add-topic.jsx`:
      "DSA topic" on the New topic tab, "DSA subtopic" on the New subtopic tab. The
      subtopic toggle is hidden under a DSA parent (same shape as the existing
      `parentHasCodeSub` guard), and the two subtopic toggles are **mutually
      exclusive in the UI** — the design leaves them independent checkboxes, but
      `addSection` would silently override a both-on state, so the form shouldn't be
      able to express it. The `aq-hint` line names the kind of question you'll add.
- [x] **5.2** `.dsa-badge` inlined in `SidebarTopicGroup.tsx` and `TopicCard.tsx` —
      two one-line call sites, below the threshold for extracting a component.
- [x] **5.3** FAB label came with 4.3. The empty-state copy needed an empty state
      **to exist first**: a subtopic with no questions was rendering "No questions
      match this filter" with a Clear filter button that did nothing, for every
      subtopic kind. `QuestionList` now derives `sectionEmpty` from the store's
      totals and shows "Nothing here yet — use the + button to add the {first DSA
      question | code question | first question}".
- [x] **5.4** _(done early — 4.1's modal needed it.)_ Output generation reuses
      `generateCodeOutput` unchanged. `PROMPTS.dsaExplanation` +
      `generateDsaExplanation` added alongside their code-output siblings; they share
      the `code-explanation` instruction preset rather than adding a fifth protected
      built-in. `add-question.jsx`'s version
      asks for the algorithm name plus time/space complexity, which the existing
      code-explanation prompt does not.

---

## Follow-up — the topic-overview FAB

Added after Phase 5, from use: `+` on a DSA topic's **overview** page (e.g.
`/data-structures-algorithms`) was opening the plain question modal, because
`findSection` resolves `topic/file` pairs and an overview URL carries only the
group slug. Worse, Phase 4.5 had just filtered DSA subtopics out of the placement
picker, so that modal offered *zero* valid destinations.

- [x] `DsaQuestionModalProps.section` became `sections: SectionMeta[]` — one prop
      rather than a section-or-group pair that could be passed in illegal
      combinations. One section renders the static line as before; several render
      an `AqSelect`. Never empty; the caller checks first.
- [x] `AddQuestionFab` recognises a topic overview (`segments.length === 1` plus
      `findGroup`) and branches three ways on a DSA topic: **no subtopics** opens
      Add subtopic scoped to that topic (a DSA question can't exist without a
      section), **one or more** opens the DSA modal over them. Non-DSA topic
      overviews keep the plain modal and its placement picker, untouched.
- [x] Saving from an overview navigates to the subtopic actually chosen, not the
      page the modal was opened from.
- [x] **A DSA topic with no subtopics still opens the question modal**, rather than
      diverting to Add subtopic (the earlier behaviour, reverted on request). The
      Subtopic field gains a **Suggest** button calling the existing
      `suggestPlacement` scoped to the one topic: an `existing` answer selects that
      subtopic, `new-subtopic`/`new-topic` stages its label as a `— new` option.
      The subtopic is created by `addSection` **on save**, so a cancelled form
      leaves nothing behind. Props became `section?` (fixed) / `groupSlug?`
      (choose within), exactly one supplied.

## Follow-up — generate every field, and the whole question from its header

- [x] `lib/ai/generateDsaQuestion.ts` + `PROMPTS.dsaQuestion(fields)` — **one** action
      behind both. The caller names the keys it wants, so "Generate all" fills the
      whole question from its header in a single request, and a per-field button is
      the same request narrowed to one key. Regenerating a field never sends that
      field back as context.
- [x] `features/authoring/components/GenerateButton.tsx` — the same button appeared
      seven times once every field had one.
- [x] `DsaQuestionModal` replaced its three per-action `GenState`s with one
      `busy` / `genError` pair keyed by field, which is what made seven buttons
      affordable. Errors now show the **real** message rather than a fixed string.
- [x] Output and Explanation keep their own code-aware actions — those read the
      code the author actually has, which a header-driven draft cannot.

## Deliberate cuts

Each names what was skipped and when to add it.

- **Prerequisites as CSV text, not a table or FK.** The design's own note calls them
  free-text labels with autocomplete, and `tags` already sets this precedent. Add a
  `prerequisites` table when you want the reverse query — "which questions depend on
  this one".
- **No manual subtopic naming.** With no subtopics yet, Suggest is the only way to
  name the first one — there's no free-text field. Add one if the AI is ever
  unavailable or keeps missing; every other Generate button has the same dependency.
- **No `AqChipInput` component.** Comma-separated text inputs for both Patterns and
  Prerequisites, matching today's Tags field. Add the chip editor when the comma
  input actually annoys you.
- **No `kind` column.** Add when a third code-bearing question type appears and
  `code && problem` stops being unambiguous.
- **`problem_html` is optional.** Drop it and render descriptions as plain text —
  `SolutionRail` already renders `problem` that way. It exists only so inline
  `` `code` `` renders, which every description sample in the design uses.
- **DSA rows open on click, like ordinary rows.** No equivalent of the code-output
  section's open-everything behaviour; `design/app.jsx` has no such case either.

## Known gap left alone

`set_aside_items` has no `code`/`output` columns, so setting aside a code question
already loses the snippet, and DSA would lose more. Out of scope — fix it only if
set-aside on these types is something you actually use.
