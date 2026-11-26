/** Visual personality of an area. Interpreted by the terrain renderer, so new themes are data plus a style entry. */
export type AreaTheme =
  | 'clearing' | 'oak' | 'pine' | 'blossom' | 'ancient' // Woodland Sanctuary
  | 'snowfield' | 'frostwood' | 'glacier' // Frozen Tundra
  | 'plains' | 'acacia' | 'baobab' // Golden Savannah
  | 'shallows' | 'willowbend' | 'fen' // Whispering Marsh
  | 'terrace' | 'crystal' | 'summit' // Skybound Peaks
  | 'glade' | 'luminous' | 'moonlit' // Enchanted Fairy Forest

export interface AreaDef {
  name: string
  theme: AreaTheme
  capacity: number // comfortable number of trees; configurable, never a hard cap on the player's total
}

/** What the main body of water is, which changes how it is drawn and what the creatures do around it. */
export type WaterStyle = 'pond' | 'ice' | 'waterhole' | 'marsh' | 'sky' | 'spirit'
/** Ambient effect drifting over the scene. */
export type AmbientEffect = 'motes' | 'snow' | 'dust' | 'fog' | 'clouds' | 'sparkles' | 'leaves' | 'petals'

export interface BiomeDef {
  id: string
  name: string
  description: string
  unlockTrees: number // total planted trees (across all biomes) required to unlock
  /** Areas fill in order. When all are full, overflow areas are generated indefinitely. */
  areas: AreaDef[]
  overflowArea: { namePrefix: string; theme: AreaTheme; capacity: number }
  palette: { grass: string[]; path: string; accent: string }
  /** Size of the main water body (pixels, incl. shore), how often a stream exists, and how the water looks. */
  terrain: {
    pondRx: number
    pondRy: number
    streamChance: number
    water: WaterStyle
    /** A floating island: ground only inside an irregular shape, open sky all around. Trees and animals stay on it. */
    floating?: boolean
  }
  effect: AmbientEffect
  /** The darkest this biome ever gets at night (0 to 1). Magical places never go fully dark. */
  lightFloor?: number
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'woodland',
    name: 'Woodland Sanctuary',
    description: 'A quiet clearing where every focused hour leaves a tree behind.',
    unlockTrees: 0,
    areas: [
      { name: 'Woodland Clearing', theme: 'clearing', capacity: 12 },
      { name: 'Oak Grove', theme: 'oak', capacity: 25 },
      { name: 'Pine Ridge', theme: 'pine', capacity: 25 },
      { name: 'Blossom Garden', theme: 'blossom', capacity: 25 },
      { name: 'Ancient Woodland', theme: 'ancient', capacity: 30 },
    ],
    overflowArea: { namePrefix: 'Deep Woods', theme: 'ancient', capacity: 30 },
    palette: { grass: ['#5c8a3a', '#639443', '#56833a', '#6a9c48'], path: '#a9824f', accent: '#e8d36a' },
    terrain: { pondRx: 30, pondRy: 17, streamChance: 0.5, water: 'pond' },
    effect: 'motes',
  },
  {
    id: 'tundra',
    name: 'Frozen Tundra',
    description: 'Wind-swept snow, frozen lakes and hardy evergreens under a pale sky.',
    unlockTrees: 15,
    areas: [
      { name: 'Snowy Flats', theme: 'snowfield', capacity: 14 },
      { name: 'Frostpine Hollow', theme: 'frostwood', capacity: 24 },
      { name: 'Glacier Edge', theme: 'glacier', capacity: 24 },
    ],
    overflowArea: { namePrefix: 'Far North', theme: 'glacier', capacity: 26 },
    palette: { grass: ['#e8f0f4', '#dfe9ef', '#eef4f7', '#d6e3ea'], path: '#b9c9d3', accent: '#9fd4f0' },
    terrain: { pondRx: 36, pondRy: 20, streamChance: 0.35, water: 'ice' },
    effect: 'snow',
  },
  {
    id: 'savannah',
    name: 'Golden Savannah',
    description: 'Sun-baked grassland, wide skies and a watering hole that draws the herds.',
    unlockTrees: 35,
    areas: [
      { name: 'Golden Plains', theme: 'plains', capacity: 14 },
      { name: 'Acacia Grove', theme: 'acacia', capacity: 24 },
      { name: 'Baobab Rise', theme: 'baobab', capacity: 24 },
    ],
    overflowArea: { namePrefix: 'Far Plains', theme: 'plains', capacity: 26 },
    palette: { grass: ['#c9b05a', '#d1b862', '#bfa650', '#d8c06c'], path: '#a8793f', accent: '#f0c060' },
    terrain: { pondRx: 28, pondRy: 15, streamChance: 0, water: 'waterhole' },
    effect: 'dust',
  },
  {
    id: 'marsh',
    name: 'Whispering Marsh',
    description: 'Murky water, reeds and drifting mist, alive with frogs and fireflies.',
    unlockTrees: 60,
    areas: [
      { name: 'Reedy Shallows', theme: 'shallows', capacity: 14 },
      { name: 'Willow Bend', theme: 'willowbend', capacity: 24 },
      { name: 'Misty Fen', theme: 'fen', capacity: 24 },
    ],
    overflowArea: { namePrefix: 'Deep Fen', theme: 'fen', capacity: 26 },
    palette: { grass: ['#3f5a38', '#46633f', '#3a5233', '#4c6b44'], path: '#6b5a3a', accent: '#b8f0a0' },
    terrain: { pondRx: 42, pondRy: 24, streamChance: 0.8, water: 'marsh' },
    effect: 'fog',
    lightFloor: 0.12,
  },
  {
    id: 'skybound',
    name: 'Skybound Peaks',
    description: 'Floating islands in an endless sky, joined by rope bridges and cut by waterfalls that fall into the clouds.',
    unlockTrees: 90,
    areas: [
      { name: 'Cloud Terrace', theme: 'terrace', capacity: 14 },
      { name: 'Crystal Ledge', theme: 'crystal', capacity: 22 },
      { name: 'Windward Summit', theme: 'summit', capacity: 22 },
    ],
    overflowArea: { namePrefix: 'High Reaches', theme: 'summit', capacity: 24 },
    palette: { grass: ['#8fc07a', '#98c884', '#86b872', '#a0d08c'], path: '#c9c0b0', accent: '#bfe8ff' },
    terrain: { pondRx: 30, pondRy: 16, streamChance: 0.7, water: 'sky', floating: true },
    effect: 'clouds',
  },
  {
    id: 'fairy',
    name: 'Enchanted Fairy Forest',
    description: 'Giant luminous trees, glowing flowers and drifting lights, where the forest seems to watch you back.',
    unlockTrees: 130,
    areas: [
      { name: 'Glimmer Glade', theme: 'glade', capacity: 14 },
      { name: 'Luminous Hollow', theme: 'luminous', capacity: 22 },
      { name: 'Moonlit Court', theme: 'moonlit', capacity: 22 },
    ],
    overflowArea: { namePrefix: 'Deep Enchantment', theme: 'moonlit', capacity: 24 },
    palette: { grass: ['#2f4a5e', '#365468', '#2b4256', '#3c5f74'], path: '#6a5a8a', accent: '#ffe08a' },
    terrain: { pondRx: 34, pondRy: 19, streamChance: 0.6, water: 'spirit' },
    effect: 'sparkles',
    lightFloor: 0.32,
  },
]

/** Biomes that exist, in unlock order. Thresholds are data, never embedded in logic. */
export const isBiomeUnlocked = (biome: BiomeDef, totalTrees: number) => totalTrees >= biome.unlockTrees
export const unlockedBiomes = (totalTrees: number) => BIOMES.filter((b) => isBiomeUnlocked(b, totalTrees))

export const getBiome = (id: string) => BIOMES.find((b) => b.id === id)

export function areaDef(biome: BiomeDef, index: number): AreaDef {
  if (index < biome.areas.length) return biome.areas[index]
  const n = index - biome.areas.length + 1
  return { name: `${biome.overflowArea.namePrefix} ${n}`, theme: biome.overflowArea.theme, capacity: biome.overflowArea.capacity }
}

export const areaId = (biomeId: string, index: number) => `${biomeId}:${index}`

export function parseAreaId(id: string): { biomeId: string; index: number } {
  const [biomeId, idx] = id.split(':')
  return { biomeId, index: Number(idx) }
}
