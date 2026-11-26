import type { Rule } from '../domain/types'

export interface WildlifeDef {
  id: string
  name: string
  description: string
  biome: string
  unlock: Rule
  rarity: 'common' | 'uncommon' | 'rare'
  /** How it moves in the habitat scene. `shore` animals (frogs, herons) stay around the water; `hop` and `walk` animals avoid it; `glide` animals drift slowly across the sky. */
  behaviour: 'flutter' | 'hop' | 'perch' | 'shore' | 'walk' | 'glide'
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
  // Skybound Peaks
  { id: 'aurora-finch', name: 'Aurora Finch', description: 'A tiny bird whose feathers shift colour like the northern lights.', biome: 'skybound', unlock: { type: 'biome-trees', biomeId: 'skybound', n: 1 }, rarity: 'common', behaviour: 'perch' },
  { id: 'peak-goat', name: 'Peak Goat', description: 'Sure-footed on any ledge, however narrow.', biome: 'skybound', unlock: { type: 'biome-trees', biomeId: 'skybound', n: 6 }, rarity: 'uncommon', behaviour: 'walk' },
  { id: 'cloud-ray', name: 'Cloud Ray', description: 'A vast, gentle glider that swims through the thin air.', biome: 'skybound', unlock: { type: 'biome-trees', biomeId: 'skybound', n: 12 }, rarity: 'rare', behaviour: 'glide' },
  // Enchanted Fairy Forest
  { id: 'pixie', name: 'Pixie', description: 'A small, curious light with wings and an opinion.', biome: 'fairy', unlock: { type: 'biome-trees', biomeId: 'fairy', n: 1 }, rarity: 'uncommon', behaviour: 'flutter' },
  { id: 'luna-moth', name: 'Luna Moth', description: 'Pale wings that glow faintly in the dark.', biome: 'fairy', unlock: { type: 'biome-trees', biomeId: 'fairy', n: 6 }, rarity: 'rare', behaviour: 'flutter' },
  { id: 'spirit-stag', name: 'Spirit Stag', description: 'A shining stag that appears only in a flourishing forest.', biome: 'fairy', unlock: { type: 'biome-trees', biomeId: 'fairy', n: 12 }, rarity: 'rare', behaviour: 'walk' },
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
  { id: 'skybound-explorer', name: 'Above the Clouds', description: 'Plant your first tree in the Skybound Peaks.', unlock: { type: 'biome-trees', biomeId: 'skybound', n: 1 } },
  { id: 'fairy-explorer', name: 'Into the Glow', description: 'Plant your first tree in the Enchanted Fairy Forest.', unlock: { type: 'biome-trees', biomeId: 'fairy', n: 1 } },
  { id: 'fifty-trees', name: 'Ancient Woodland', description: 'Plant 50 trees.', unlock: { type: 'trees', n: 50 } },
]

/** Discovery Points granted per first discovery. */
/**
 * Rare discoveries: special finds that appear only when a particular combination of things has been grown.
 * They are collectibles of their own, separate from species and wildlife.
 */
export interface RareDef {
  id: string
  name: string
  description: string
  unlock: Rule
}

export const RARE_DISCOVERIES: RareDef[] = [
  { id: 'blossom-grove', name: 'Blossom Grove', description: 'Enough cherry blossoms in one place bring a hidden, petal-covered clearing to life.', unlock: { type: 'species-trees', speciesId: 'cherry-blossom', n: 5 } },
  { id: 'sky-bridge', name: 'Skyward Bridge', description: 'Crystal and cloud grown together raise a shimmering bridge between the islands.', unlock: { type: 'all', rules: [{ type: 'species-trees', speciesId: 'cloudwood', n: 3 }, { type: 'species-trees', speciesId: 'crystal-spire', n: 3 }] } },
  { id: 'heart-of-forest', name: 'Heart of the Forest', description: 'A ring of luminous oaks wakes something very old at the centre of the wood.', unlock: { type: 'species-trees', speciesId: 'luminous-oak', n: 4 } },
  { id: 'aurora-gathering', name: 'Aurora Gathering', description: 'When both fantasy realms flourish, the lights of each answer one another.', unlock: { type: 'all', rules: [{ type: 'biome-trees', biomeId: 'skybound', n: 5 }, { type: 'biome-trees', biomeId: 'fairy', n: 5 }] } },
]

export const DISCOVERY_POINTS = { species: 10, wildlife: 15, achievement: 20, biome: 50, rare: 40 } as const
