# ADR 0007: Polish (Phase 7)

The brief lists many possible polish items and says they must not delay the core product. This phase delivers a coherent subset and leaves the rest explicitly undone (see the end).

## Decisions

- **Display options live on the preferences record.** Day and night, seasons, weather, motion, quality, sound, music and volume are optional fields on the existing `Preferences` row, resolved against defaults in `domain/preferences.ts`. No schema migration was needed, older records and older backups still load (backup version 4 adds the fields as optional), and the options will sync with everything else later. They are read in one place (`AppData.display`).
- **Day and night.** `domain/daylight.ts` turns the local clock into a darkness and a dawn/dusk warmth (full day 07:30 to 17:30, ramps either side, night until 05:00). The scene draws one tinted overlay between the world and the glowing particles, so lights stay bright against a dark sky. Players can pin day or night. Magical biomes never go fully dark (`lightFloor` is biome data).
- **Creatures keep hours.** `WildlifeDef.activity` is `day`, `night` or unset. Day creatures sleep (are hidden) at night, and moths and fireflies appear only then, so the lighting changes what you see.
- **Seasons, woodland only.** `domain/season.ts` has the pure colour rules, tested without a canvas. Broadleaf woodland trees are recoloured per season from the same sprites (autumn in patches, winter frost, fresh spring green) and the grass follows. The woodland's weather follows too (petals, motes, falling leaves, snow). Evergreens, fantasy species and the other biomes keep a constant climate.
- **Reduced motion and quality.** "Calm" (from the OS setting, or chosen) stops all drifting and wandering and removes weather. "Low quality" (from a modest device, or chosen) uses about 40% of the particles and one creature per kind. Both are decided from the player's choice plus the device, never silently.
- **Sound is generated, and off by default.** `audio/soundscape.ts` synthesises wind, birdsong, crickets, cicadas, frog croaks, whistles and chimes with the Web Audio API, per biome and per day or night, plus slow generative pentatonic music. No audio files, so nothing to download and it works offline. Nothing starts without a tap (browser rule): the Settings toggle is that tap, and the first touch resumes a suspended context. It fades in and out, pauses when the app is hidden, and plays in the habitat and during a running focus session.
- **Accessibility.** A skip link; the habitat is keyboard-operable (arrows pan, plus and minus zoom) and has a text list of its trees for screen readers; the OS reduced-motion setting also stops interface animation; focus rings are visible.
- **More to achieve and see.** Rules `biomes-unlocked` and `rares-found`, five more achievements, and two Insights cards (when you focus, trees by biome).

## Not done

- A fuller world map (the world overview from Phase 5 remains).
- Spending Nature Energy on decorations, and rare finds appearing in the world.
- A frame-rate cap and device-specific tuning beyond fewer particles and creatures.
- Seasons outside the woodland, and the southern hemisphere (seasons assume the north).
- Real recorded sound and music.
