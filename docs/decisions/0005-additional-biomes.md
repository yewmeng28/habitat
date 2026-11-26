# ADR 0005: Frozen Tundra, Golden Savannah and Whispering Marsh (Phase 5)

## Decisions

- **A biome is data.** `BiomeDef` now carries its palette, unlock threshold, areas (name, theme, capacity), overflow area, water style and size, stream chance, and ambient effect. Nothing in the logic names a biome: unlocking, planting, area filling and terrain all read this data, so a fifth biome is a data entry plus art.
- **Unlock rule.** A biome opens at its `unlockTrees` threshold (15, 35, 60), counted as total trees planted across every biome. A discovery of kind `biome` is recorded once, with 50 Discovery Points, like species and wildlife.
- **Planting.** `startSession` requires the biome to be unlocked, the species to belong to it, and the species' own rule to be met. The session stores its biome, so completion plants in that biome with the same atomic, idempotent path as before. Each biome fills its own areas, with unlimited overflow, and trees never move between biomes.
- **New rule type `biome-trees`** (trees planted in one biome) drives the second and third species of each biome, each biome's wildlife and the explorer achievements. A biome's first species is always available once the biome is open.
- **Shared selection.** The biome you are viewing (Habitat) and planting in (Focus) is one value kept in a small external store backed by `localStorage` (wrapped in try/catch), defaulting to the biome of your latest tree. The running session keeps its own biome, so the Focus backdrop follows the session.
- **Terrain.** `areaTerrain` reads the biome from the area id (`tundra:1`), so pond size and stream chance come from data. Placement, drawing and wildlife all read the same terrain, so trees and animals respect the water in every biome. The renderer paints per biome: a frozen lake with cracks and ice spikes and snow drifts; a muddy waterhole with footprints, termite mounds and thorn bushes; a large reedy marsh pool with a plank boardwalk, mud, duckweed and glowing mushrooms.
- **Wildlife.** A new `walk` behaviour (long, slow strides with a two-pose cycle) for large animals, which never enter or cross water. Herons and marsh frogs use the `shore` behaviour, and fireflies flutter and blink.
- **Weather per biome**: pollen motes, falling snow, blowing dust, and drifting mist with glowing specks.
- **World overview** lists every biome with its progress. It is part of the area sheet on phones and a section of the page elsewhere. Locked biomes show how many more trees they need.

## Known gaps

- Only the savannah's lion from the brief is missing; each biome has three animals.
- Biomes use landscape and portrait variants of the same layout generator, so layouts are procedural rather than hand-authored.
- Seasons, day and night, and sound remain Phase 7.
- Fantasy biomes (Skybound Peaks, Enchanted Fairy Forest) are Phase 6.
