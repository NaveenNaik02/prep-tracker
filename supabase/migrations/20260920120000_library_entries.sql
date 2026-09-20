-- Library: standalone Markdown write-ups (algorithms, patterns, notes) kept
-- for reading rather than answering. Private per-user content like
-- inbox_items, so ownership is user_id and every policy scopes to it — no
-- created_by/admin split, which only exists for the shared-authoring tables.
-- Unlike inbox_items these are edited in place, so there is an update policy.

create table if not exists public.library_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'algorithm'
                check (type in ('algorithm', 'pattern', 'data-structure',
                                'concept', 'technique', 'cheatsheet', 'note')),
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The list page reads one user's entries newest-edit-first.
create index if not exists library_entries_user_id_updated_at
  on public.library_entries (user_id, updated_at desc);

alter table public.library_entries enable row level security;

create policy "library_entries_select_own" on public.library_entries
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "library_entries_insert_own" on public.library_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "library_entries_update_own" on public.library_entries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "library_entries_delete_own" on public.library_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.library_entries to authenticated;
