# Ops

Developer runbook — cloud, deploys, secrets. Agents don't run anything here.

## Environment

`.env.local` (cloud): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `FREE_GEM_API_KEY`, plus `DEV_USER` / `DEV_PW` for the local account.
`.env.local.docker` (local): what `pnpm dev` sources — points at `http://127.0.0.1:54321`.

`pnpm dev:remote` runs against cloud on :3010 with `distDir` `.next-remote`, so it can run alongside `pnpm dev` (see `next.config.js`).

### `SUPABASE_ACCESS_TOKEN` expires

A personal access token (`sbp_…`) with a real expiry and no warning. It lives in **two places** — `.env.local` and the `SUPABASE_ACCESS_TOKEN` GitHub secret — update both together. When it lapses, the deploy's migration step fails with `401 Unauthorized`; `scripts/migrate.js` prints what to do. Manage at <https://supabase.com/dashboard/account/tokens>.

| Rotated on | Expires                        | Notes                                                               |
| ---------- | ------------------------------ | ------------------------------------------------------------------- |
| 2026-09-12 | _(fill in from the dashboard)_ | Previous token expired ~2026-09-08 and broke the 2026-09-12 deploy. |

## Cloud scripts

```bash
pnpm migrate      # apply pending supabase/migrations/*.sql to cloud
pnpm set-admin    # scripts/set-admin.js <email> [--revoke]
pnpm pull-remote  # copy cloud data into local Docker, re-owned to DEV_USER (upsert-only, never writes remote)
node --env-file=.env.local scripts/reassign-owner.js <from-email> <to-email>  # move content + study data between accounts (not user_settings)
```

## CI/CD

- `.github/workflows/ci.yml` — `lint` and `test` jobs on every push to `main`.
- `.github/workflows/deploy.yml` — **manual only** (`workflow_dispatch`). Runs `scripts/migrate.js` first, then builds and deploys to Vercel production. Needs `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` secrets alongside the Vercel ones.
- `vercel.json` sets `git.deploymentEnabled: false` — pushes build nothing. Node is pinned to 24 via `engines.node`.

## Known leftovers

- **Stale service worker.** Offline support was removed 2026-09-12, but browsers that installed the old worker keep serving the `interview-pages-v2` cache until site data is cleared — a 404 on `/sw.js` doesn't unregister it ([w3c/ServiceWorker#204](https://github.com/w3c/ServiceWorker/issues/204)). Accepted; no unregister shim shipped.
- **pnpm build-script warning** for `esbuild`, `sharp`, `unrs-resolver` is cosmetic — they ship prebuilt binaries.
