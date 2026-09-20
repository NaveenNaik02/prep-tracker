-- "Open standalone": a public, unguessable link to one Library entry.
--
-- The read deliberately does NOT go through a new RLS policy. A policy
-- permissive enough for anon (`to anon using (true)`) would expose every
-- row to anyone, since a policy cannot see which token the caller typed.
-- A security-definer function can: it returns rows only for an exact token
-- match, so the table stays owner-scoped and unreadable to anon as before.

alter table public.library_entries
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists library_entries_share_token
  on public.library_entries (share_token);

create or replace function public.shared_library_entry(token uuid)
returns table (type text, title text, content text)
language sql
stable
security definer
set search_path = public
as $$
  select e.type, e.title, e.content
  from public.library_entries e
  where e.share_token = token;
$$;

-- Only the exact-token lookup is reachable; nothing else about the table is.
revoke all on function public.shared_library_entry(uuid) from public;
grant execute on function public.shared_library_entry(uuid) to anon, authenticated;
