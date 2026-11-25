# ADR 0001: Local-first foundation (Phase 1)

## Decisions

- **Dexie over raw IndexedDB.** Thin typed wrapper; still IndexedDB underneath. No localStorage for data.
- **Sync-ready records.** Every row has `id` (UUID), `userId` (null for guests), `createdAt`, `updatedAt`, `deletedAt`. Deletes are soft so a future sync can propagate them.
- **Layering.** `domain/` is pure (no DB, no React). `persistence/` owns IndexedDB and backup. `features/` is UI only. `sync/` and `game/` come later.
- **Nature Energy is an append-only ledger.** Balance is derived by summing entries. Each entry has a unique `sourceKey` (`habit:<id>:<date>`), so awarding is idempotent. Undoing a completion soft-deletes the entry, and redoing restores it.
- **Calendar days are local-time `YYYY-MM-DD` strings**, never UTC timestamps, so a habit done at 11pm counts for that day.
- **Gentle streaks.** An unfinished today never breaks a streak. Challenge days with no entry pause a streak rather than reset it.
- **Backup.** Zod-validated JSON with referential-integrity checks. Import runs in one transaction. `replace` needs explicit UI confirmation, and `merge` keeps the newest version of each record, matching on natural keys (habit+date, source key) as well as IDs.
- **HashRouter** so GitHub Pages needs no SPA fallback. Base path via `VITE_BASE_PATH`.
- **Guest mode** is the only mode: no account is required, and none exists yet.
