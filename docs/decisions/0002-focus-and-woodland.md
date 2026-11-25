# ADR 0002: Focus sessions and the Woodland (Phase 2)

## Decisions

- **Timestamp timer.** A session stores `startedAt`, `pausedAt` and `pausedMs`. Elapsed time is always computed from those and the current clock, so refreshes and iOS suspension can't desync it. The 500ms interval only triggers re-renders.
- **Completion is atomic and idempotent.** `completeSession` runs in one transaction: it marks the session completed, plants the tree and writes the Nature Energy ledger entry (`focus:<sessionId>`). `plantedTrees.focusSessionId` has a unique index, so a retry can never produce a second tree or reward. The same pattern carries over to a database-side unique constraint in Phase 4.
- **Sessions that ended while the app was closed** are settled on the next open (`settleOpenSession`). Their tree and reward are dated to when the session actually finished.
- **Interruptions** are stored as `interrupted` with no tree and no reward. Nothing existing is ever modified or deleted.
- **Placement is deterministic.** `assignArea` picks the first area with room (capacities are in `data/biomes.ts`). When all defined areas are full, overflow areas are generated, so there is no global tree limit. `slotPosition` gives each tree a shuffled-grid slot seeded by the area id. Positions are stored normalised (0..1), independent of rendering size.
- **Static content is data.** `data/species.ts` and `data/biomes.ts` define species and biomes, with area capacities. Biome id is a field everywhere (sessions, trees, areas), so more biomes need data and art, not restructuring.
- **Phaser is isolated.** `src/game/` receives plain view models (`AreaView`, `TreeView`) and reports selection through a callback. It never imports React, Dexie or domain persistence. It is loaded with a dynamic `import()` so other tabs don't pay for its ~1.3MB.
- **Pixel art is procedural.** `src/game/pixel.ts` draws each species with its own silhouette function onto small canvases using whole-pixel fills. Stages scale the same silhouette, and everything is drawn nearest-neighbour. The same sprites feed the Phaser scene and the Focus preview. These are original placeholders in a single consistent style, and can be replaced by authored sprite sheets later without changing the game API.
- **Backup version 2** adds sessions and trees. Version 1 files still import (missing arrays default to empty). Import validates that every tree has a session and that no session has two trees.

## Known gaps

- Species unlock only by completed-session count. Hours, milestones and achievements come in Phase 3.
- Ambient animation is limited to drifting cloud shadows and floating motes. No wildlife yet.
- Trees are placed automatically, and there is no manual rearranging.
- No forest overview map yet (Phase 3).
