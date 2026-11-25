# ADR 0003: Collection, discoveries and wildlife (Phase 3)

## Decisions

- **One rule type for everything.** Species, wildlife and achievements share a data-driven `Rule` (`sessions`, `hours`, `trees`, `species-trees`, `area-trees`, `species-discovered`, `habit-streak`). The content lives in `data/species.ts` and `data/collection.ts`. `domain/progress.ts` evaluates rules against computed `Stats` and generates the "Plant 3 Birch trees" requirement text, so adding content is a data change.
- **Unlocks are derived, discoveries are recorded.** Whether a species can be planted is computed from current stats (rules only ever become more satisfied). The `discoveries` table records the first time something was earned, for the discovery date, Discovery Points and the toast. It has a unique `[kind+itemId]` index, and `syncDiscoveries` re-checks inside a transaction, so concurrent or repeated runs never double-award.
- **Discovery Points and Biodiversity** come from discovery records. Biodiversity counts species and wildlife, and is an achievement indicator only. Nothing in this system can be lost or decay.
- **Wildlife is attracted by what you grow:** tree counts, per-species counts and the density of a single area. Counts per area scale gently with that area's tree count.
- **Wildlife is presentation.** The Phaser scene receives `WildlifeView[]` and animates it with a small per-critter state machine (flutter, hop, perch) driven by `update()`. Critters are rebuilt only when the wildlife set or area changes, so planting a tree doesn't make them jump.
- **Forest overview** is an SVG miniature per area with one dot per tree, so no sprites are rendered. It also shows the next area as locked, with how many trees it needs.
- **Backup v3** includes discoveries. Older files still import, and discoveries re-derive on next launch.

## Known gaps

- Plants, flowers and mushrooms from the brief are not in the Collection yet. Only trees, wildlife and achievements are.
- Only the Woodland Sanctuary exists. The Collection notes more biomes are planned, but there is no biome tab or world map.
- Wildlife sprites are original placeholders in the same pixel style.
- Habit-streak achievements depend on a streak running today.
