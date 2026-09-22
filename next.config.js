/** @type {import('next').NextConfig} */
module.exports = {
  // dev:remote sets DEV_REMOTE=1 so it builds into its own directory,
  // avoiding the "Another next dev server is already running" lock conflict
  // with a plain `pnpm dev` (local Supabase) running at the same time.
  distDir: process.env.DEV_REMOTE ? '.next-remote' : '.next',
}
