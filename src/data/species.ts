export type Rarity = 'common' | 'uncommon' | 'rare'

export interface SpeciesDef {
  id: string
  name: string
  description: string
  biomes: string[]
  /** Completed focus sessions needed. Richer unlock rules (hours, milestones) arrive in Phase 3. */
  unlockSessions: number
  rarity: Rarity
}

/** Static content. Sprites are generated per species in src/game/pixel.ts, keyed by id. */
export const SPECIES: SpeciesDef[] = [
  {
    id: 'oak',
    name: 'Oak',
    description: 'A broad, sturdy crown. The heart of any woodland.',
    biomes: ['woodland'],
    unlockSessions: 0,
    rarity: 'common',
  },
  {
    id: 'pine',
    name: 'Pine',
    description: 'Tiered, evergreen and narrow. Stands tall in every season.',
    biomes: ['woodland'],
    unlockSessions: 1,
    rarity: 'common',
  },
  {
    id: 'birch',
    name: 'Birch',
    description: 'Slender white bark and a light, airy crown.',
    biomes: ['woodland'],
    unlockSessions: 3,
    rarity: 'uncommon',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'A drift of pink petals on a gently bent trunk.',
    biomes: ['woodland'],
    unlockSessions: 6,
    rarity: 'rare',
  },
]

export const getSpecies = (id: string) => SPECIES.find((s) => s.id === id)
