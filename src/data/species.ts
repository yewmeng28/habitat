import type { Rule } from '../domain/types'

export type Rarity = 'common' | 'uncommon' | 'rare'

export interface SpeciesDef {
  id: string
  name: string
  description: string
  biomes: string[]
  unlock: Rule
  rarity: Rarity
}

/** Static content. Sprites are generated per species in src/game/pixel.ts, keyed by id. */
export const SPECIES: SpeciesDef[] = [
  { id: 'oak', name: 'Oak', description: 'A broad, sturdy crown. The heart of any woodland.', biomes: ['woodland'], unlock: { type: 'always' }, rarity: 'common' },
  { id: 'pine', name: 'Pine', description: 'Tiered, evergreen and narrow. Stands tall in every season.', biomes: ['woodland'], unlock: { type: 'sessions', n: 1 }, rarity: 'common' },
  { id: 'birch', name: 'Birch', description: 'Slender white bark and a light, airy crown.', biomes: ['woodland'], unlock: { type: 'sessions', n: 3 }, rarity: 'uncommon' },
  { id: 'maple', name: 'Maple', description: 'A rounded crown that glows red as the seasons turn.', biomes: ['woodland'], unlock: { type: 'trees', n: 8 }, rarity: 'common' },
  { id: 'cherry-blossom', name: 'Cherry Blossom', description: 'A drift of pink petals on a gently bent trunk.', biomes: ['woodland'], unlock: { type: 'sessions', n: 6 }, rarity: 'rare' },
  { id: 'willow', name: 'Willow', description: 'Long, trailing branches that sway toward the water.', biomes: ['woodland'], unlock: { type: 'hours', n: 3 }, rarity: 'uncommon' },
  { id: 'ginkgo', name: 'Ginkgo', description: 'Fan-shaped golden leaves on an ancient lineage.', biomes: ['woodland'], unlock: { type: 'species-trees', speciesId: 'birch', n: 3 }, rarity: 'rare' },
  { id: 'cedar', name: 'Cedar', description: 'Layered, spreading boughs. Slow, patient and long-lived.', biomes: ['woodland'], unlock: { type: 'sessions', n: 20 }, rarity: 'rare' },
  // Frozen Tundra
  { id: 'snowy-pine', name: 'Snowy Pine', description: 'Tiered boughs weighed down with fresh snow.', biomes: ['tundra'], unlock: { type: 'always' }, rarity: 'common' },
  { id: 'frost-spruce', name: 'Frost Spruce', description: 'Tall, narrow and silvered with frost.', biomes: ['tundra'], unlock: { type: 'biome-trees', biomeId: 'tundra', n: 3 }, rarity: 'uncommon' },
  { id: 'arctic-willow', name: 'Arctic Willow', description: 'A low, wind-bent tree with silky white catkins.', biomes: ['tundra'], unlock: { type: 'biome-trees', biomeId: 'tundra', n: 8 }, rarity: 'rare' },
  // Golden Savannah
  { id: 'acacia', name: 'Acacia', description: 'A flat-topped umbrella of shade on a slender trunk.', biomes: ['savannah'], unlock: { type: 'always' }, rarity: 'common' },
  { id: 'baobab', name: 'Baobab', description: 'A vast bottle trunk that stores a lifetime of rain.', biomes: ['savannah'], unlock: { type: 'biome-trees', biomeId: 'savannah', n: 3 }, rarity: 'uncommon' },
  { id: 'doum-palm', name: 'Doum Palm', description: 'A forking palm with a crown of stiff, fanned fronds.', biomes: ['savannah'], unlock: { type: 'biome-trees', biomeId: 'savannah', n: 8 }, rarity: 'rare' },
  // Whispering Marsh
  { id: 'mangrove', name: 'Mangrove', description: 'Arching stilt roots lift it above the tidal mud.', biomes: ['marsh'], unlock: { type: 'always' }, rarity: 'common' },
  { id: 'bald-cypress', name: 'Bald Cypress', description: 'Feathery needles and knobbly knees rising from the water.', biomes: ['marsh'], unlock: { type: 'biome-trees', biomeId: 'marsh', n: 3 }, rarity: 'uncommon' },
  { id: 'marsh-willow', name: 'Marsh Willow', description: 'Dark, trailing fronds hung with moss.', biomes: ['marsh'], unlock: { type: 'biome-trees', biomeId: 'marsh', n: 8 }, rarity: 'rare' },
  // Skybound Peaks
  { id: 'cloudwood', name: 'Cloudwood', description: 'Its crown is a small, drifting cloud that never quite rains.', biomes: ['skybound'], unlock: { type: 'always' }, rarity: 'uncommon' },
  { id: 'crystal-spire', name: 'Crystal Spire', description: 'Faceted crystal grown tall, humming softly in the wind.', biomes: ['skybound'], unlock: { type: 'biome-trees', biomeId: 'skybound', n: 3 }, rarity: 'rare' },
  { id: 'skyroot', name: 'Skyroot', description: 'A tree that floats on its own scrap of island, roots trailing in the air.', biomes: ['skybound'], unlock: { type: 'biome-trees', biomeId: 'skybound', n: 8 }, rarity: 'rare' },
  // Enchanted Fairy Forest
  { id: 'luminous-oak', name: 'Luminous Oak', description: 'A giant oak whose leaves glow from within.', biomes: ['fairy'], unlock: { type: 'always' }, rarity: 'uncommon' },
  { id: 'moonwillow', name: 'Moonwillow', description: 'Silver fronds that shimmer and tip themselves with moonlight.', biomes: ['fairy'], unlock: { type: 'biome-trees', biomeId: 'fairy', n: 3 }, rarity: 'rare' },
  { id: 'lantern-tree', name: 'Lantern Tree', description: 'Hung with fruit that burns like tiny lanterns.', biomes: ['fairy'], unlock: { type: 'biome-trees', biomeId: 'fairy', n: 8 }, rarity: 'rare' },
]

export const getSpecies = (id: string) => SPECIES.find((s) => s.id === id)
