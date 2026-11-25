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
]

export const getSpecies = (id: string) => SPECIES.find((s) => s.id === id)
