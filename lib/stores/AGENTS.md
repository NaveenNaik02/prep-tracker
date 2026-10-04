# AGENTS.md — lib/stores/

One Zustand store (`appStore.ts`) composed of slices — some in `slices/`, some owned by their feature (`features/*/store/`). Shared types in `types.ts`.

- **Never a module singleton.** `createAppStore(init)` (`zustand/vanilla`) + `StoreContext`; `StoreProvider.tsx` builds one per tree in a `useState` lazy initializer. A module-level `create()` is shared across every request in the Next server process — a cross-account leak.
- **Server data is seeded at construction, not by an effect.** `app/(app)/layout.tsx` passes `getAllGroups()` + `fetchAllCounts()` into `<StoreProvider groups totals>`.
  - `totals` is seeded once, never re-synced — `setSectionTotal()` refines it as sections mount.
  - `groups` _is_ re-synced by a `StoreProvider` effect on every `router.refresh()`; that's how a new topic reaches the tree.
  - `initAuth` / `hydrateSettings` stay in effects (localStorage, subscriptions).
- **Consume via** `useAppStore(selector)` (`useShallow` works) or `useAppStoreApi()` for imperative `getState`/`subscribe`. There is no importable store instance; slices use `get()`.
- **Mutations are online-only.** No pending-ops queue or write buffer; a failed write rolls the store back. Don't add one.
- Not in this store: client-only UI state (`lib/context/` — drawer, search, theme, font size), the authoring modals' own store, and the FAB offset store in `lib/hooks/useFabDrag.ts`.
