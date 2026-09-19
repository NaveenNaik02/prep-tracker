-- Pin order follows the sequence topics were pinned in, which a boolean can't
-- record — pinned topics fell back to creation order. A nullable timestamp
-- carries both facts: null means unpinned, and the value orders the rest.
alter table public.topic_groups
  add column pinned_at timestamptz;

-- Keep any pins made under the boolean column.
update public.topic_groups set pinned_at = now() where pinned;

alter table public.topic_groups
  drop column pinned;
