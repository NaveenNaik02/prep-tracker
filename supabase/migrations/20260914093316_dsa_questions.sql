-- DSA questions: a problem statement plus its solution code, output, and an
-- explanation of the approach. See DSA_QUESTION_PLAN.md.
--
-- Only four columns are new — difficulty reuses `priority` (low/med/high read
-- as Easy/Medium/Hard), pattern tags reuse `tags`, the description reuses
-- `problem`, and the explanation reuses `markdown`/`body_html`.
--
-- `problem_html` is the description rendered at write time, mirroring the
-- markdown/body_html pair — `problem` alone is plain text (that's how
-- SolutionRail renders it), and DSA descriptions carry inline code.
--
-- `prerequisites` is comma-separated free text, same shape as `tags`. They are
-- labels the author types, not references to other questions.
--
-- No `kind` column: `code` and `problem` are mutually exclusive in every
-- existing row (the code-output form never writes `problem`, the plain form
-- never writes `code`), so both being set is what marks a DSA question.

alter table public.questions
  add column problem_html text,
  add column prerequisites text;

-- DSA-ness belongs to the subtopic, parallel to the reserved `code_output`
-- slug but without its one-per-topic cap: a DSA topic has many DSA subtopics
-- (Arrays & Strings, Linked Lists, …), each with an ordinary slug. The
-- topic-level flag makes every subtopic added under it DSA automatically.

alter table public.sections
  add column is_dsa boolean not null default false;

alter table public.topic_groups
  add column is_dsa boolean not null default false;
