# AGENTS.md — supabase/

Schema and database workflow. Root rules still apply: local Docker only, never cloud, never reset.

## Migrations

`migrations/` is the source of truth for schema — the only files you hand-write and the only ones applied to any database. `supabase start` replays them into the local stack from scratch; `supabase migration up --local` applies just the pending ones to a running stack.

Adding a table, start to finish:

```bash
supabase migration new add_foo   # real timestamp — several older filenames were hand-invented
# write create table + enable RLS + policies + grants into the new file
supabase migration up --local    # applies only pending migrations; NOT db reset
pnpm db:schema                   # schema/foo.sql appears on its own
pnpm migrate                     # cloud — the developer runs this, never an agent
```

`pnpm migrate` (`scripts/migrate.js`) stands in for `supabase db push`: it applies pending files via the Management API and records them in `supabase_migrations.schema_migrations`, the same table the CLI uses.

## `schema/` is generated — never edit it

One file per table or view (columns, constraints, indexes, RLS, grants together), dumped from the **local** DB by `scripts/db-schema.sh`, which wipes the directory first. A hand-edit is gone on the next `pnpm db:schema` and never reaches any database — wanting to edit one means you want a new migration. Regenerate after applying a migration locally, and commit the result. Nothing reads it at runtime.

**It pictures local, not cloud.** `seed.sql` runs on `supabase start` and is never pushed, so anything it creates appears in the snapshot but not on the hosted project. Check a policy came from `migrations/` before treating it as production reality.

## Not used: declarative schemas

`supabase/schemas/` + `supabase db diff` was rejected: the diff engine skips `alter policy`, `security_invoker` views, and DML — most of what these migrations contain. Don't propose it again.

## Local stack

`config.toml` disables `realtime`, `storage`, `inbucket`, `edge_runtime`, `analytics`, `studio` — the app only uses Postgres, GoTrue, PostgREST. Re-enable one by flipping `enabled` and running `pnpm db:stop && pnpm db:start` (flags apply only on a fresh start). Browse data with `pnpm db:psql`.

Nothing seeds an account — `seed.sql` only adds an RLS policy. Sign up once at `/signup` with `DEV_USER` / `DEV_PW` from `.env.local`; `scripts/pull-remote.js` finds that account by email to re-own imported rows, so it must match exactly.
