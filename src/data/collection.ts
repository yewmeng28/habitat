import type { Rule } from '../domain/types'

export interface WildlifeDef {
  id: string
  name: string
  description: string
  biome: string
  unlock: Rule
  rarity: 'common' | 'uncommon' | 'rare'
  /** How it moves in the habitat scene. `shore` animals (frogs, herons) stay around the water; `hop` and `walk` animals avoid it. */
  behaviour: 'flutter' | 'hop' | 'perch' | 'shore' | 'walk'
}

/** Wildlife is attracted by what the user has grown. Kept deliberately simple for the first release. */
export const WILDLIFE: WildlifeDef[] = [
  { id: 'songbird', name: 'Songbird', description: 'Drawn to your first tree. It hops between branches.', biome: 'woodland', unlock: { type: 'trees', n: 1 }, rarity: 'common', behaviour: 'perch' },
  { id: 'butterfly', name: 'Meadow Butterfly', description: 'Follows the wildflowers of a growing clearing.', biome: 'woodland', unlock: { type: 'trees', n: 3 }, rarity: 'common', behaviour: 'flutter' },
  { id: 'squirrel', name: 'Red Squirrel', description: 'Moves in once oaks start to cluster.', biome: 'woodland', unlock: { type: 'species-trees', speciesId: 'oak', n: 3 }, rarity: 'common', behaviour: 'hop' },
  { id: 'rabbit', name: 'Field Rabbit', description: 'Shelters in a woodland that is getting dense.', biome: 'woodland', unlock: { type: 'area-trees', n: 8 }, rarity: 'uncommon', behaviour: 'hop' },
  { id: 'frog', name: 'Pond Frog', description: 'Arrives when an area is lush enough to feed it.', biome: 'woodland', unlock: { type: 'area-trees', n: 12 }, rarity: 'uncommon', behaviour: 'shore' },
  { id: 'blossom-butterfly', name: 'Blossom Butterfly', description: 'A rare pink butterfly that only visits a true blossom garden.', biome: 'woodland', unlock: { type: 'species-trees', speciesId: 'cherry-blossom', n: 3 }, rarity: 'rare', behaviour: 'flutter' },
  // Frozen Tundra
  { id: 'snow-hare', name: 'Snow Hare', description: 'A white hare that freezes still when watched.', biome: 'tundra', unlock: { type: 'biome-trees', biomeId: 'tundra', n: 1 }, rarity: 'common', behaviour: 'hop' },
  { id: 'arctic-fox', name: 'Arctic Fox', description: 'Trots the snowfields on silent, furred paws.', biome: 'tundra', unlock: { type: 'biome-trees', biomeId: 'tundra', n: 5 }, rarity: 'uncommon', behaviour: 'walk' },
  { id: 'reindeer', name: 'Reindeer', description: 'Antlered wanderers that follow the lichen.', biome: 'tundra', unlock: { type: 'biome-trees', biomeId: 'tundra', n: 10 }, rarity: 'rare', behaviour: 'walk' },
  // Golden Savannah
  { id: 'zebra', name: 'Zebra', description: 'Striped grazers that stay close to the herd.', biome: 'savannah', unlock: { type: 'biome-trees', biomeId: 'savannah', n: 1 }, rarity: 'common', behaviour: 'walk' },
  { id: 'giraffe', name: 'Giraffe', description: 'Browses the acacia tops no one else can reach.', biome: 'savannah', unlock: { type: 'biome-trees', biomeId: 'savannah', n: 6 }, rarity: 'uncommon', behaviour: 'walk' },
  { id: 'elephant', name: 'Elephant', description: 'Arrives only once the savannah can feed a herd.', biome: 'savannah', unlock: { type: 'biome-trees', biomeId: 'savannah', n: 12 }, rarity: 'rare', behaviour: 'walk' },
  // Whispering Marsh
  { id: 'marsh-frog', name: 'Marsh Frog', description: 'Calls from the reeds as dusk settles.', biome: 'marsh', unlock: { type: 'biome-trees', biomeId: 'marsh', n: 1 }, rarity: 'common', behaviour: 'shore' },
  { id: 'heron', name: 'Grey Heron', description: 'Stands motionless in the shallows, waiting.', biome: 'marsh', unlock: { type: 'biome-trees', biomeId: 'marsh', n: 6 }, rarity: 'uncommon', behaviour: 'shore' },
  { id: 'firefly', name: 'Firefly', description: 'Tiny lights that gather when the marsh is thriving.', biome: 'marsh', unlock: { type: 'biome-trees', biomeId: 'marsh', n: 12 }, rarity: 'rare', behaviour: 'flutter' },
]

export const getWildlife = (id: string) => WILDLIFE.find((w) => w.id === id)

export interface AchievementDef {
  id: string
  name: string
  description: string
  unlock: Rule
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-tree', name: 'First Roots', description: 'Plant your first tree.', unlock: { type: 'trees', n: 1 } },
  { id: 'five-sessions', name: 'Finding Focus', description: 'Complete 5 focus sessions.', unlock: { type: 'sessions', n: 5 } },
  { id: 'ten-trees', name: 'A Small Grove', description: 'Plant 10 trees.', unlock: { type: 'trees', n: 10 } },
  { id: 'ten-hours', name: 'Deep Work', description: 'Focus for 10 hours in total.', unlock: { type: 'hours', n: 10 } },
  { id: 'twentyfive-trees', name: 'Woodland Keeper', description: 'Plant 25 trees.', unlock: { type: 'trees', n: 25 } },
  { id: 'five-species', name: 'Naturalist', description: 'Unlock 5 tree species.', unlock: { type: 'species-discovered', n: 5 } },
  { id: 'streak-7', name: 'Steady Growth', description: 'Reach a 7-day habit streak.', unlock: { type: 'habit-streak', n: 7 } },
  { id: 'tundra-explorer', name: 'Into the Snow', description: 'Plant your first tree in the Frozen Tundra.', unlock: { type: 'biome-trees', biomeId: 'tundra', n: 1 } },
  { id: 'savannah-explorer', name: 'Golden Hour', description: 'Plant your first tree in the Golden Savannah.', unlock: { type: 'biome-trees', biomeId: 'savannah', n: 1 } },
  { id: 'marsh-explorer', name: 'Misty Footsteps', description: 'Plant your first tree in the Whispering Marsh.', unlock: { type: 'biome-trees', biomeId: 'marsh', n: 1 } },
  { id: 'fifty-trees', name: 'Ancient Woodland', description: 'Plant 50 trees.', unlock: { type: 'trees', n: 50 } },
]

/** Discovery Points granted per first discovery. */
export const DISCOVERY_POINTS = { species: 10, wildlife: 15, achievement: 20, biome: 50 } as const
