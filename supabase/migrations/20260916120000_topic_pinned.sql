-- Dashboard pinning. Pinned topics sort to the front of the topic grid.
-- topic_groups already has owner + admin UPDATE policies, which cover this
-- column, so no new policy is needed.
alter table public.topic_groups
  add column pinned boolean not null default false;
