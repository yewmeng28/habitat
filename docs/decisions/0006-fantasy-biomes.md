# ADR 0006: Skybound Peaks and the Enchanted Fairy Forest (Phase 6)

## Decisions

- **Same biome system, three small extensions.** Both biomes are ordinary `BiomeDef` entries (unlock at 90 and 130 trees, three areas plus overflow, three species, three creatures). The system only grew where the fantasy needed it: a `floating` terrain flag, two water styles (`sky`, `spirit`), two ambient effects (`clouds`, `sparkles`), and a `glide` behaviour.
- **Floating islands are a land mask, not a new world type.** `Terrain` gains `floating` and an irregular, wobbly ellipse (`inLand`), drawn from the area id like the rest of the layout. Outside it is open sky. The renderer paints the sky, drifting clouds, distant islets joined by a rope bridge, the island's rocky underside, and turns the stream into a waterfall that falls over the edge. The mask is read in exactly the places water already was: tree placement (the whole crown must stand on the island, away from the edge), decoration placement, and wildlife movement (`isInWater` treats the void as impassable). So trees and ground animals stay on the island with no special cases elsewhere.
- **Appended randomness.** The mask's random values are drawn after all earlier ones, so no existing area's pond, path or stream moved.
- **Rare discoveries.** A new rule type `all` combines sub-rules (progress is the sum of the parts, so a combination shows one bar). `RARE_DISCOVERIES` (Blossom Grove, Skyward Bridge, Heart of the Forest, Aurora Gathering) are a separate collectible kind (`rare`, 40 Discovery Points, its own Collection tab), recorded idempotently like every other discovery.
- **Art reuse.** The Aurora Finch reuses the robin's pose and four flight frames recoloured, and the Spirit Stag reuses the reindeer drawing in glowing colours. Each is a function of a palette, so further recolours are cheap.
- **Fairy ground** is deliberately calm and dark so the glowing flowers, mushrooms, crystals and lights carry the scene.

## Known gaps

- Rare discoveries are recorded and shown in the Collection but have no visible effect in the world yet (for example a bridge appearing between islands).
- Spending Nature Energy on special decorations is still unbuilt; only found, natural decorations exist.
- Cloud Ray and Luna Moth are simple. The moth reuses the butterfly's wing frames in new colours.
- Day and night, seasons and sound remain Phase 7.
